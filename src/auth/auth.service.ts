import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import type { AppConfig } from "../config/configuration";
import type { JwtPayload } from "./jwt.strategy";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SignedInUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<{ app: AppConfig }, true>,
  ) {}

  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: SignedInUser; tokens: TokenPair }> {
    const user = await this.users.findForLogin(email);
    /**
     * One message for a wrong address and a wrong password alike. Telling
     * them apart tells someone which addresses have accounts.
     */
    const wrong = new UnauthorizedException("Those details do not match an account.");
    if (!user || !user.active) throw wrong;
    if (!(await this.users.verify(user, password))) throw wrong;

    await this.users.noteLogin(String(user._id));
    const signed: SignedInUser = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return { user: signed, tokens: await this.mint(signed, user.tokenVersion) };
  }

  /** Trades a refresh token for a new pair. */
  async refresh(token: string): Promise<{ user: SignedInUser; tokens: TokenPair }> {
    const app = this.config.get("app", { infer: true });
    let payload: JwtPayload & { typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: app.jwt.secret });
    } catch {
      throw new UnauthorizedException("Please sign in again.");
    }
    // An access token must not be usable as a refresh token.
    if (payload.typ !== "refresh") throw new UnauthorizedException("Please sign in again.");

    const user = await this.users.findActiveById(payload.sub);
    if (!user || user.tokenVersion !== payload.v) {
      throw new UnauthorizedException("Please sign in again.");
    }
    const signed: SignedInUser = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return { user: signed, tokens: await this.mint(signed, user.tokenVersion) };
  }

  private async mint(user: SignedInUser, tokenVersion: number): Promise<TokenPair> {
    const app = this.config.get("app", { infer: true });
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      v: tokenVersion,
    };
    /**
     * `expiresIn` is typed as ms's own `StringValue` union ("30m", "7d", …)
     * rather than `string`, and these come from the environment, where
     * nothing can be known at compile time. The config loader is where the
     * value is checked; here it is passed through.
     */
    const expires = (ttl: string) => ttl as unknown as number;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: app.jwt.secret,
        expiresIn: expires(app.jwt.accessTtl),
      }),
      this.jwt.signAsync(
        { ...payload, typ: "refresh" },
        { secret: app.jwt.secret, expiresIn: expires(app.jwt.refreshTtl) },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
