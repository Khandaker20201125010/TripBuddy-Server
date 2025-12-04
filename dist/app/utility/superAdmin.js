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
exports.ensureSuperAdmin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const config_1 = __importDefault(require("../config"));
const prisma_1 = require("../shared/prisma");
const ensureSuperAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    const email = config_1.default.super_admin.email;
    const password = config_1.default.super_admin.password;
    if (!email || !password) {
        console.log("⚠️ SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD missing in .env");
        return;
    }
    // Check if user already exists
    const existingUser = yield prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        console.log("✔️ Super Admin already exists.");
        return;
    }
    // Hash password
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    // Create permanent super admin
    yield prisma_1.prisma.user.create({
        data: {
            email,
            name: "Super Admin",
            password: hashedPassword,
            role: client_1.Role.ADMIN,
            status: "ACTIVE",
            needPasswordChange: false,
        },
    });
    console.log("🎉 Permanent Super Admin created successfully!");
});
exports.ensureSuperAdmin = ensureSuperAdmin;
