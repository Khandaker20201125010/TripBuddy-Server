"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPlanValidation = void 0;
const zod_1 = require("zod");
exports.TravelPlanValidation = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            destination: zod_1.z.string().min(1, "Destination is required"),
            startDate: zod_1.z.string().min(1, "Start date is required"),
            endDate: zod_1.z.string().min(1, "End date is required"),
            budget: zod_1.z.number().min(0, "Budget must be positive"),
            travelType: zod_1.z.string().min(1, "Travel type is required"),
            description: zod_1.z.string().optional(),
            visibility: zod_1.z.boolean().optional(),
        }),
    }),
    update: zod_1.z.object({
        body: zod_1.z.object({
            destination: zod_1.z.string().optional(),
            startDate: zod_1.z.string().optional(),
            endDate: zod_1.z.string().optional(),
            budget: zod_1.z.number().optional(),
            travelType: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            visibility: zod_1.z.boolean().optional(),
            image: zod_1.z.string().optional(),
        }),
    }),
};
