import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { Role } from "../../schemas/user.schema";
import type { AuthUser } from "../decorators/current-user.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException();
    if (user.role === "admin") return true; // admin is every role
    if (!required.includes(user.role as Role)) {
      throw new ForbiddenException(
        `This needs the ${required.join(" or ")} role; yours is ${user.role}.`,
      );
    }
    return true;
  }
}
