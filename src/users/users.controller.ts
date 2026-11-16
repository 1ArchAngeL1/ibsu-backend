import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { Roles } from "../common/decorators/roles.decorator";
import { AuditService } from "../revisions/audit.service";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";

@Controller("users")
@Roles("admin")
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const users = await this.users.list();
    return users.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      active: u.active,
      lastLoginAt: u.lastLoginAt ?? null,
    }));
  }

  @Post()
  async create(@Body() body: CreateUserDto, @CurrentUser() actor?: AuthUser) {
    const user = await this.users.create(body);
    await this.audit.record(actor, "users.create", user.email, { role: user.role });
    return { id: String(user._id), email: user.email, role: user.role };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() actor?: AuthUser,
  ) {
    const user = await this.users.update(id, body);
    await this.audit.record(actor, "users.update", user.email, {
      // never the password itself, only that it changed
      changed: Object.keys(body).map((k) => (k === "password" ? "password" : k)),
    });
    return { id: String(user._id), email: user.email, role: user.role, active: user.active };
  }
}
