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
const login = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const isCorrectPassword = yield bcryptjs_1.default.compare(payload.password, user.password);
    if (!isCorrectPassword) {
        throw new Error("Password is incorrect!");
    }
    const accessToken = jwtHelper_1.jwtHelper.generateToken({ id: user.id, email: user.email, role: user.role }, config_1.default.jwt.access_secret, "1h");
    const refreshToken = jwtHelper_1.jwtHelper.generateToken({ id: user.id, email: user.email, role: user.role }, config_1.default.jwt.refresh_secret, "90d");
    return {
        accessToken,
        refreshToken,
        needPasswordChange: user.needPasswordChange,
    };
});
exports.AuthService = {
    login,
};
