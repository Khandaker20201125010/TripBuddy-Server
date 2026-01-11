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
exports.AuthService = void 0;
// backend/src/modules/auth/auth.services.ts
const prisma_1 = require("../../shared/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwtHelper_1 = require("../../helper/jwtHelper");
const client_1 = require("@prisma/client");
const config_1 = __importDefault(require("../../config"));
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const location_service_1 = require("../location/location.service");
// Helper to get client IP
const getClientIP = (req) => {
    if (!req)
        return '';
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        if (Array.isArray(xForwardedFor)) {
            return xForwardedFor[0].split(',')[0].trim();
        }
        return xForwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '';
};
const login = (payload, req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const user = yield prisma_1.prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const isCorrectPassword = yield bcryptjs_1.default.compare(payload.password, user.password);
    if (!isCorrectPassword) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Password is incorrect!");
    }
    // REMOVED: Forced Bangladesh location
    // Only detect location if user doesn't have one or it's very old
    if (!user.latitude || !user.longitude) {
        try {
            const clientIp = getClientIP(req);
            if (clientIp) {
                console.log(`📍 Detecting location for user ${user.email} from IP: ${clientIp}`);
                // Use the enhanced location service
                yield location_service_1.LocationService.getOrCreateUserLocation(user.id, clientIp);
            }
        }
        catch (error) {
            console.error("Failed to detect location on login:", error);
            // Continue without location - it's optional
        }
    }
    const accessToken = jwtHelper_1.jwtHelper.generateToken({ id: user.id, email: user.email, role: user.role }, config_1.default.jwt.access_secret, "1h");
    const refreshToken = jwtHelper_1.jwtHelper.generateToken({ id: user.id, email: user.email, role: user.role }, config_1.default.jwt.refresh_secret, "90d");
    // Get updated user with location
    const updatedUser = yield prisma_1.prisma.user.findUnique({
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
            latitude: (_a = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.latitude) !== null && _a !== void 0 ? _a : null,
            longitude: (_b = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.longitude) !== null && _b !== void 0 ? _b : null,
            locationName: (_c = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.locationName) !== null && _c !== void 0 ? _c : null,
            city: (_d = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.city) !== null && _d !== void 0 ? _d : null,
            country: (_e = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.country) !== null && _e !== void 0 ? _e : null
        },
    };
});
const loginWithGoogle = (payload, req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const user = yield prisma_1.prisma.user.upsert({
        where: { email: payload.email },
        update: {
            name: payload.name,
            profileImage: payload.image
        },
        create: {
            email: payload.email,
            name: payload.name,
            role: "USER",
            status: client_1.UserStatus.ACTIVE,
            password: yield bcryptjs_1.default.hash(Math.random().toString(36).slice(-8), 12),
            needPasswordChange: false,
            profileImage: payload.image
        },
    });
    if (user.status !== client_1.UserStatus.ACTIVE) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Your account is not active");
    }
    // Auto-detect location for new Google users
    if (!user.latitude || !user.longitude) {
        try {
            const clientIp = getClientIP(req);
            if (clientIp) {
                console.log(`📍 Detecting location for Google user ${user.email} from IP: ${clientIp}`);
                yield location_service_1.LocationService.getOrCreateUserLocation(user.id, clientIp);
            }
        }
        catch (error) {
            console.error("Failed to detect location for Google user:", error);
        }
    }
    const jwtPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwtHelper_1.jwtHelper.generateToken(jwtPayload, config_1.default.jwt.access_secret, "1h");
    const refreshToken = jwtHelper_1.jwtHelper.generateToken(jwtPayload, config_1.default.jwt.refresh_secret, "90d");
    // Get updated user with location
    const updatedUser = yield prisma_1.prisma.user.findUnique({
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
            latitude: (_a = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.latitude) !== null && _a !== void 0 ? _a : null,
            longitude: (_b = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.longitude) !== null && _b !== void 0 ? _b : null,
            locationName: (_c = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.locationName) !== null && _c !== void 0 ? _c : null,
            city: (_d = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.city) !== null && _d !== void 0 ? _d : null,
            country: (_e = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.country) !== null && _e !== void 0 ? _e : null
        },
    };
});
const refreshToken = (token) => __awaiter(void 0, void 0, void 0, function* () {
    let decodedData;
    try {
        decodedData = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.refresh_secret);
    }
    catch (err) {
        throw new Error("You are not authorized!");
    }
    const userData = yield prisma_1.prisma.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const accessToken = jwtHelper_1.jwtHelper.generateToken({
        id: userData.id,
        email: userData.email,
        role: userData.role,
    }, config_1.default.jwt.access_secret, "1h");
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
});
exports.AuthService = {
    login,
    loginWithGoogle,
    refreshToken,
};
