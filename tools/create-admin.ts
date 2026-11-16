/**
 * Makes the first account, so somebody can sign in to the admin.
 *
 *     tsx tools/create-admin.ts you@ibsu.edu.ge "Your Name"
 *
 * The password is read from ADMIN_PASSWORD, or generated and printed once.
 * Run it again with the same address to reset that account's password.
 */
import crypto from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserSchema } from "../src/schemas/user.schema";

async function main(): Promise<void> {
  const [email, name] = process.argv.slice(2);
  if (!email) {
    console.error('usage: tsx tools/create-admin.ts <email> "<name>"');
    process.exit(1);
  }

  const password =
    process.env.ADMIN_PASSWORD ?? crypto.randomBytes(18).toString("base64url");
  const generated = !process.env.ADMIN_PASSWORD;

  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const User = mongoose.model("User", UserSchema);

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email: email.toLowerCase() }).exec();

  if (existing) {
    existing.set({ passwordHash, role: "admin", active: true });
    // Ends every session that account already had.
    existing.set("tokenVersion", (existing.get("tokenVersion") as number) + 1);
    await existing.save();
    console.log(`reset the password for ${email}`);
  } else {
    await User.create({
      email: email.toLowerCase(),
      name: name ?? email.split("@")[0],
      passwordHash,
      role: "admin",
      active: true,
    });
    console.log(`created ${email} as an admin`);
  }

  if (generated) {
    console.log(`\npassword: ${password}\n\nThis is the only time it is shown.`);
  }
  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
