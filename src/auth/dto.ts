import { IsEmail, IsString, MinLength } from "class-validator";

export class SignInDto {
  @IsEmail({}, { message: "That does not look like an email address." })
  email!: string;

  @IsString()
  @MinLength(1, { message: "Enter your password." })
  password!: string;
}
