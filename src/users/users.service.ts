import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, User, type Role, type UserDocument } from "../schemas/user.schema";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<UserDocument>) {}

  async list(): Promise<UserDocument[]> {
    return this.users.find().sort({ name: 1 }).exec();
  }

  /** Includes the hash, which is `select: false` everywhere else. */
  async findForLogin(email: string): Promise<UserDocument | null> {
    return this.users
      .findOne({ email: email.toLowerCase().trim() })
      .select("+passwordHash")
      .exec();
  }

  async findActiveById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.users.findOne({ _id: id, active: true }).exec();
  }

  async create(input: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }): Promise<UserDocument> {
    if (!ROLES.includes(input.role)) throw new BadRequestException("Unknown role.");
    this.assertPassword(input.password);
    const email = input.email.toLowerCase().trim();
    if (await this.users.exists({ email })) {
      throw new BadRequestException("Somebody already has that address.");
    }
    return this.users.create({
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    });
  }

  async update(
    id: string,
    changes: { name?: string; role?: Role; active?: boolean; password?: string },
  ): Promise<UserDocument> {
    const user = await this.users.findById(id).exec();
    if (!user) throw new NotFoundException("No such account.");

    if (changes.name !== undefined) user.name = changes.name.trim();
    if (changes.role !== undefined) {
      if (!ROLES.includes(changes.role)) throw new BadRequestException("Unknown role.");
      user.role = changes.role;
    }
    if (changes.active !== undefined) {
      user.active = changes.active;
      // Suspending has to take effect now, not when the token expires.
      if (!changes.active) user.tokenVersion += 1;
    }
    if (changes.password !== undefined) {
      this.assertPassword(changes.password);
      user.passwordHash = await bcrypt.hash(changes.password, BCRYPT_ROUNDS);
      user.tokenVersion += 1;
    }
    return user.save();
  }

  async verify(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async noteLogin(id: string): Promise<void> {
    await this.users.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } }).exec();
  }

  async count(): Promise<number> {
    return this.users.countDocuments().exec();
  }

  private assertPassword(password: string): void {
    if (password.length < 12) {
      throw new BadRequestException("Passwords need to be at least 12 characters.");
    }
  }
}
