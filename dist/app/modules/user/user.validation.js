"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = void 0;
const zod_1 = require("zod");
const createUserValidation = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required"),
        email: zod_1.z.string().email("Invalid email"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        profileImage: zod_1.z.string().optional(),
    }),
});
const updateUserValidation = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
        profileImage: zod_1.z.string().optional(),
        interests: zod_1.z.array(zod_1.z.string()).optional(),
        visitedCountries: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
const loginValidation = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1),
    }),
});
const createAdminValidationSchema = zod_1.z.object({
    password: zod_1.z.string({
        error: "Password is required"
    }),
    admin: zod_1.z.object({
        name: zod_1.z.string({
            error: "Name is required!"
        }),
        email: zod_1.z.string({
            error: "Email is required!"
        }),
        contactNumber: zod_1.z.string({
            error: "Contact Number is required!"
        })
    })
});
exports.UserValidation = {
    createUserValidation,
    updateUserValidation,
    createAdminValidationSchema,
    loginValidation,
};
