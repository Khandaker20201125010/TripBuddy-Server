import bcrypt from "bcryptjs";

import { Role } from "@prisma/client";
import config from "../config";
import { prisma } from "../shared/prisma";

export const ensureSuperAdmin = async () => {
  const email = config.super_admin.email;
  const password = config.super_admin.password;

  if (!email || !password) {
    console.log("⚠️ SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD missing in .env");
    return;
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("✔️ Super Admin already exists.");
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create permanent super admin
  await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      password: hashedPassword,
      role: Role.ADMIN,
      status: "ACTIVE",
      needPasswordChange: false,
    },
  });

  console.log("🎉 Permanent Super Admin created successfully!");
};
