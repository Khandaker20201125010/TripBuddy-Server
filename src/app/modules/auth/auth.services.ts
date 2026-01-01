import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { Secret } from "jsonwebtoken";
import { jwtHelper } from "../../helper/jwtHelper";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";

const login = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
      status: UserStatus.ACTIVE,
    },
  });

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    user.password
  );
  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password is incorrect!");
  }

  const accessToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.access_secret as Secret,
    "1h"
  );
  const refreshToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.refresh_secret as Secret,
    "90d"
  );

  return {
    accessToken,
    refreshToken,
    needPasswordChange: user.needPasswordChange,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImage: user.profileImage, // ← ADD THIS LINE
      premium: user.premium,
      subscriptionType: user.subscriptionType
    },
  };
};

// auth.services.ts -> loginWithGoogle
const loginWithGoogle = async (payload: {
  email: string;
  name: string;
  image?: string;
}) => {
  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: { 
      name: payload.name,
      profileImage: payload.image // ← Also update profileImage for Google users
    },
    create: {
      email: payload.email,
      name: payload.name,
      role: "USER",
      status: UserStatus.ACTIVE,
      password: await bcrypt.hash(Math.random().toString(36).slice(-8), 12),
      needPasswordChange: false,
      profileImage: payload.image // ← Add profileImage for new Google users
    },
  });

  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is not active");
  }

  const jwtPayload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwtHelper.generateToken(
    jwtPayload,
    config.jwt.access_secret as Secret,
    "1h"
  );
  const refreshToken = jwtHelper.generateToken(
    jwtPayload,
    config.jwt.refresh_secret as Secret,
    "90d"
  );

  return {
    accessToken,
    refreshToken,
    needPasswordChange: user.needPasswordChange,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImage: user.profileImage, // ← ADD THIS LINE
      premium: user.premium, 
      subscriptionType: user.subscriptionType,
    },
  };
};

const refreshToken = async (token: string) => {
  let decodedData;
  try {
    decodedData = jwtHelper.verifyToken(
      token,
      config.jwt.refresh_secret as Secret
    );
  } catch (err) {
    throw new Error("You are not authorized!");
  }

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: decodedData.email,
      status: UserStatus.ACTIVE,
    },
  });

  const accessToken = jwtHelper.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    "1h"
  );

  return {
    accessToken,
    refreshToken,
    needPasswordChange: userData.needPasswordChange,
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      profileImage: userData.profileImage, // ← ADD THIS LINE
      premium: userData.premium,
      subscriptionType: userData.subscriptionType
    },
  };
};

export const AuthService = {
  login,
  loginWithGoogle,
  refreshToken,
};