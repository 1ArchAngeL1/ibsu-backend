import { SetMetadata } from "@nestjs/common";
import type { Role } from "../../schemas/user.schema";

export const ROLES_KEY = "ibsu:roles";

/** Any one of these roles may call the route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
