import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService, type TokenPair } from "./auth.service";
import { SignInDto } from "./dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth.constants";
import { AuditService } from "../revisions/audit.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Five attempts a minute from one address. Enough for somebody who has
   * forgotten which password they used, nowhere near enough to work
   * through a list.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("sign-in")
  async signIn(@Body() body: SignInDto, @Req() request: Request, @Res() response: Response) {
    try {
      const { user, tokens } = await this.auth.signIn(body.email, body.password);
      this.setCookies(response, tokens);
      await this.audit.record(user, "auth.sign-in", user.email, undefined, request.ip);
      /**
       * The tokens travel in the body as well as in the cookies.
       *
       * The admin runs inside the website, on another origin, and renders on
       * the server: a cookie this API sets for its own host would never be
       * sent back by the browser. So the website's sign-in action reads them
       * from here and keeps its own httpOnly cookies. The cookies above are
       * for anything talking to this API directly.
       */
      response.json({ user, tokens });
    } catch (error) {
      await this.audit.record(
        undefined,
        "auth.sign-in-failed",
        body.email,
        undefined,
        request.ip,
      );
      throw error;
    }
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() request: Request, @Res() response: Response) {
    const token = (request.cookies?.[REFRESH_COOKIE] as string) ?? "";
    const { user, tokens } = await this.auth.refresh(token);
    this.setCookies(response, tokens);
    response.json({ user, tokens });
  }

  @Public()
  @Post("sign-out")
  signOut(@Res() response: Response) {
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
      response.clearCookie(name, { path: "/" });
    }
    response.json({ ok: true });
  }

  /** Who the caller is, for the admin's header and its permission checks. */
  @Get("me")
  me(@CurrentUser() user?: AuthUser) {
    return { user: user ?? null };
  }

  private setCookies(response: Response, tokens: TokenPair): void {
    const secure = process.env.NODE_ENV === "production";
    const common = {
      httpOnly: true,
      secure,
      // The admin is served from the website's own origin, so the cookie is
      // same-site; `lax` still lets a sign-in redirect carry it.
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...common,
      maxAge: 30 * 60 * 1000,
    });
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...common,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
