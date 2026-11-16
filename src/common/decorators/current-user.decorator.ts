import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined =>
    context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user,
);
