"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPlanValidation = void 0;
// travelPlan.validation.ts
const zod_1 = require("zod");
exports.TravelPlanValidation = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            destination: zod_1.z.string().min(1),
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
            budget: zod_1.z.coerce.number(),
            travelType: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            visibility: zod_1.z
                .union([zod_1.z.boolean(), zod_1.z.string()])
                .transform(v => v === true || v === "true")
                .optional(),
        }),
    }),
    update: zod_1.z.object({
        body: zod_1.z.object({
            destination: zod_1.z.string().optional(),
            startDate: zod_1.z.string().optional(),
            endDate: zod_1.z.string().optional(),
            budget: zod_1.z.coerce.number().optional(),
            travelType: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            visibility: zod_1.z
                .union([zod_1.z.boolean(), zod_1.z.string()])
                .transform(v => v === true || v === "true")
                .optional(),
            image: zod_1.z.string().optional(),
        }),
    }),
};
