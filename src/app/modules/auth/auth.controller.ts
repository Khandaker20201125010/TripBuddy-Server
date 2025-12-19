import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.services";
import config from "../../config";
import httpStatus from "http-status";

const isProd = config.node_env === "production";

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    const { accessToken, refreshToken, needPasswordChange, user } = result;

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

// ✅ UPDATED: Google Login Controller
const loginWithGoogle = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginWithGoogle(req.body);
    // ✅ Extract user
    const { accessToken, refreshToken, needPasswordChange, user } = result;

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
            user, // ✅ Send user to frontend
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