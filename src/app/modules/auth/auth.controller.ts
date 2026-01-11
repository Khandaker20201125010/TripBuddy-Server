// backend/src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.services";

import config from "../../config";
import httpStatus from "http-status";
import { LocationService } from "../location/location.service";

const isProd = config.node_env === "production";

// Helper to get client IP
const getClientIP = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0].split(',')[0].trim();
    }
    return xForwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
};

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    const { accessToken, refreshToken, needPasswordChange, user } = result;

    // Auto-detect location after successful login
    try {
      const clientIp = getClientIP(req);
      await LocationService.getOrCreateUserLocation(user.id, clientIp);
    } catch (locationError) {
      console.error("Failed to detect location on login:", locationError);
      // Don't fail login if location detection fails
    }

    res.cookie("accessToken", accessToken, {
        secure: isProd,
        httpOnly: false, 
        sameSite: isProd ? "none" : "lax",
        maxAge: 1000 * 60 * 60,
    });
    
    res.cookie("refreshToken", refreshToken, {
        secure: isProd,
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 90,
    });

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "User loggedin successfully!",
        data: {
            accessToken,
            refreshToken,
            needPasswordChange,
            user,
        },
    });
});

// Google Login Controller
const loginWithGoogle = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginWithGoogle(req.body);
    const { accessToken, refreshToken, needPasswordChange, user } = result;

    // Auto-detect location after successful Google login
    try {
      const clientIp = getClientIP(req);
      await LocationService.getOrCreateUserLocation(user.id, clientIp);
    } catch (locationError) {
      console.error("Failed to detect location on Google login:", locationError);
      // Don't fail login if location detection fails
    }

    res.cookie("accessToken", accessToken, {
        secure: isProd,
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        maxAge: 1000 * 60 * 60,
    });
    
    res.cookie("refreshToken", refreshToken, {
        secure: isProd,
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 90,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Google login successful!",
        data: {
            accessToken,
            refreshToken,
            needPasswordChange,
            user,
        },
    });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    const result = await AuthService.refreshToken(refreshToken);
    
    res.cookie("accessToken", result.accessToken, {
        secure: isProd,
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        maxAge: 1000 * 60 * 60,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Access token generated successfully!",
        data: {
            accessToken: result.accessToken,
            needPasswordChange: result.needPasswordChange,
        },
    });
});

export const AuthController = {
    login,
    loginWithGoogle,
    refreshToken,
};