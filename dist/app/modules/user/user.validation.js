"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidation = exports.updateUserValidation = exports.createUserValidation = void 0;
const zod_1 = require("zod");
exports.createUserValidation = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required"),
        email: zod_1.z.string().email("Invalid email"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        profileImage: zod_1.z.string().optional(),
    }),
});
exports.updateUserValidation = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
        profileImage: zod_1.z.string().optional(),
        interests: zod_1.z.array(zod_1.z.string()).optional(),
        visitedCountries: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.loginValidation = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1),
    }),
});
