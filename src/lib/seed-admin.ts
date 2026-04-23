import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN = {
  name: "Admin",
  email: "admin@admin.com",
  password: "123qweQWE!@#",
};

/**
 * Ensures at least one admin user exists in the database.
 * Called on admin login if no users exist yet.
 */
export async function ensureDefaultAdmin() {
  await connectDB();
  const count = await User.countDocuments({});
  if (count > 0) return;

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
  await User.create({
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email,
    passwordHash,
    emailVerified: true,
    role: "admin",
  });
  console.log(`[Seed] Default admin created: ${DEFAULT_ADMIN.email}`);
}
