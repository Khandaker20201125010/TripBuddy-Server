"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewValidation = void 0;
const zod_1 = require("zod");
const createReviewValidation = zod_1.z.object({
    body: zod_1.z.object({
        revieweeId: zod_1.z.string({ error: "Reviewee ID is required" }),
        travelPlanId: zod_1.z.string({ error: "Travel Plan ID is required" }),
        rating: zod_1.z.number().min(1).max(5, "Rating must be between 1 and 5"),
        content: zod_1.z.string().optional(),
    }),
});
const updateReviewValidation = zod_1.z.object({
    body: zod_1.z.object({
        rating: zod_1.z.number().min(1).max(5).optional(),
        content: zod_1.z.string().optional(),
    }),
});
exports.ReviewValidation = {
    createReviewValidation,
    updateReviewValidation,
};
