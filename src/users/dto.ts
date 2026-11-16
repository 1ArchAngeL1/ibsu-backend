import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { ROLES, type Role } from "../schemas/user.schema";

export class CreateUserDto {
  @IsEmail({}, { message: "That does not look like an email address." })
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(12, { message: "Passwords need to be at least 12 characters." })
  password!: string;

  @IsIn(ROLES)
  role!: Role;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;
}
