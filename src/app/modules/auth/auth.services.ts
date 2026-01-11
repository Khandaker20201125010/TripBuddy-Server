// backend/src/modules/auth/auth.services.ts
import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { Secret } from "jsonwebtoken";
import { jwtHelper } from "../../helper/jwtHelper";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";

import { Request } from "express";
import { LocationService } from "../location/location.service";

// Helper to get client IP
const getClientIP = (req?: Request): string => {
  if (!req) return '';
  
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0].split(',')[0].trim();
    }
    return xForwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
};

const login = async (payload: { email: string; password: string }, req?: Request) => {
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

  // REMOVED: Forced Bangladesh location
  // Only detect location if user doesn't have one or it's very old
  if (!user.latitude || !user.longitude) {
    try {
      const clientIp = getClientIP(req);
      if (clientIp) {
        console.log(`📍 Detecting location for user ${user.email} from IP: ${clientIp}`);
        
        // Use the enhanced location service
        await LocationService.getOrCreateUserLocation(user.id, clientIp);
      }
    } catch (error) {
      console.error("Failed to detect location on login:", error);
      // Continue without location - it's optional
    }
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

  // Get updated user with location
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      profileImage: true,
      premium: true,
      subscriptionType: true,
      latitude: true,
      longitude: true,
      locationName: true,
      city: true,
      country: true,
      locationUpdatedAt: true
    }
  });

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
      profileImage: user.profileImage,
      premium: user.premium,
      subscriptionType: user.subscriptionType,
      latitude: updatedUser?.latitude ?? null,
      longitude: updatedUser?.longitude ?? null,
      locationName: updatedUser?.locationName ?? null,
      city: updatedUser?.city ?? null,
      country: updatedUser?.country ?? null
    },
  };
};

const loginWithGoogle = async (
  payload: { email: string; name: string; image?: string }, 
  req?: Request
) => {
  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: { 
      name: payload.name,
      profileImage: payload.image
    },
    create: {
      email: payload.email,
      name: payload.name,
      role: "USER",
      status: UserStatus.ACTIVE,
      password: await bcrypt.hash(Math.random().toString(36).slice(-8), 12),
      needPasswordChange: false,
      profileImage: payload.image
    },
  });

  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is not active");
  }

  // Auto-detect location for new Google users
  if (!user.latitude || !user.longitude) {
    try {
      const clientIp = getClientIP(req);
      if (clientIp) {
        console.log(`📍 Detecting location for Google user ${user.email} from IP: ${clientIp}`);
        await LocationService.getOrCreateUserLocation(user.id, clientIp);
      }
    } catch (error) {
      console.error("Failed to detect location for Google user:", error);
    }
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

  // Get updated user with location
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      profileImage: true,
      premium: true,
      subscriptionType: true,
      latitude: true,
      longitude: true,
      locationName: true,
      city: true,
      country: true,
      locationUpdatedAt: true
    }
  });

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
      profileImage: user.profileImage,
      premium: user.premium,
      subscriptionType: user.subscriptionType,
      latitude: updatedUser?.latitude ?? null,
      longitude: updatedUser?.longitude ?? null,
      locationName: updatedUser?.locationName ?? null,
      city: updatedUser?.city ?? null,
      country: updatedUser?.country ?? null
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
    refreshToken: token,
    needPasswordChange: userData.needPasswordChange,
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      profileImage: userData.profileImage,
      premium: userData.premium,
      subscriptionType: userData.subscriptionType,
      latitude: userData.latitude,
      longitude: userData.longitude,
      locationName: userData.locationName,
      city: userData.city,
      country: userData.country
    },
  };
};

export const AuthService = {
  login,
  loginWithGoogle,
  refreshToken,
};