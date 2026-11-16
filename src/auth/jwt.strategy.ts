import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { UsersService } from "../users/users.service";
import { ACCESS_COOKIE } from "./auth.constants";
import type { AuthUser } from "../common/decorators/current-user.decorator";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** matched against the account's; see User.tokenVersion */
  v: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersService) {
    super({
      /**
       * The cookie first, the header second. The admin is server-rendered
       * and sends an httpOnly cookie, which keeps the token out of reach of
       * any script on the page; scripts and other services send a header.
       */
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => (request.cookies?.[ACCESS_COOKIE] as string) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.JWT_SECRET!,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findActiveById(payload.sub);
    if (!user) throw new UnauthorizedException("This account is no longer active.");
    // A token minted before a password change or a suspension is finished.
    if (user.tokenVersion !== payload.v) {
      throw new UnauthorizedException("Please sign in again.");
    }
    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
