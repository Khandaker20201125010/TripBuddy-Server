"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const auth_services_1 = require("./auth.services");
const config_1 = __importDefault(require("../../config"));
const http_status_1 = __importDefault(require("http-status"));
const location_service_1 = require("../location/location.service");
const isProd = config_1.default.node_env === "production";
// Helper to get client IP
const getClientIP = (req) => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        if (Array.isArray(xForwardedFor)) {
            return xForwardedFor[0].split(',')[0].trim();
        }
        return xForwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '';
};
const login = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield auth_services_1.AuthService.login(req.body);
    const { accessToken, refreshToken, needPasswordChange, user } = result;
    // Auto-detect location after successful login
    try {
        const clientIp = getClientIP(req);
        yield location_service_1.LocationService.getOrCreateUserLocation(user.id, clientIp);
    }
    catch (locationError) {
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
    (0, sendResponse_1.default)(res, {
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
}));
// Google Login Controller
const loginWithGoogle = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield auth_services_1.AuthService.loginWithGoogle(req.body);
    const { accessToken, refreshToken, needPasswordChange, user } = result;
    // Auto-detect location after successful Google login
    try {
        const clientIp = getClientIP(req);
        yield location_service_1.LocationService.getOrCreateUserLocation(user.id, clientIp);
    }
    catch (locationError) {
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
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Google login successful!",
        data: {
            accessToken,
            refreshToken,
            needPasswordChange,
            user,
        },
    });
}));
const refreshToken = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { refreshToken } = req.cookies;
    const result = yield auth_services_1.AuthService.refreshToken(refreshToken);
    res.cookie("accessToken", result.accessToken, {
        secure: isProd,
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        maxAge: 1000 * 60 * 60,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Access token generated successfully!",
        data: {
            accessToken: result.accessToken,
            needPasswordChange: result.needPasswordChange,
        },
    });
}));
exports.AuthController = {
    login,
    loginWithGoogle,
    refreshToken,
};
