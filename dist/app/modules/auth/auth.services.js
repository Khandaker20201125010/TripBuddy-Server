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
const prisma_1 = require("../../shared/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwtHelper_1 = require("../../helper/jwtHelper");
const client_1 = require("@prisma/client");
const config_1 = __importDefault(require("../../config"));
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const login = (payload) => __awaiter(void 0, void 0, void 0, function* () {
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
    const accessToken = jwtHelper_1.jwtHelper.generateToken({ id: user.id, email: user.email, role: user.role }, config_1.default.jwt.access_secret, "1h");
    const refreshToken = jwtHelper_1.jwtHelper.generateToken({ id: user.id, email: user.email, role: user.role }, config_1.default.jwt.refresh_secret, "90d");
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
});
// auth.services.ts -> loginWithGoogle
const loginWithGoogle = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.upsert({
        where: { email: payload.email },
        update: {
            name: payload.name,
            profileImage: payload.image // ← Also update profileImage for Google users
        },
        create: {
            email: payload.email,
            name: payload.name,
            role: "USER",
            status: client_1.UserStatus.ACTIVE,
            password: yield bcryptjs_1.default.hash(Math.random().toString(36).slice(-8), 12),
            needPasswordChange: false,
            profileImage: payload.image // ← Add profileImage for new Google users
        },
    });
    if (user.status !== client_1.UserStatus.ACTIVE) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Your account is not active");
    }
    const jwtPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwtHelper_1.jwtHelper.generateToken(jwtPayload, config_1.default.jwt.access_secret, "1h");
    const refreshToken = jwtHelper_1.jwtHelper.generateToken(jwtPayload, config_1.default.jwt.refresh_secret, "90d");
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
});
exports.AuthService = {
    login,
    loginWithGoogle,
    refreshToken,
};
