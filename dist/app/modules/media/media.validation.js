"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaValidation = void 0;
const zod_1 = require("zod");
const createMediaPost = zod_1.z.object({
    body: zod_1.z.object({
        caption: zod_1.z.string().optional(),
        location: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        travelPlanId: zod_1.z.string().optional(),
    }),
});
const addComment = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1, "Comment content is required"),
        parentId: zod_1.z.string().optional(),
    }),
});
const updateMediaPost = zod_1.z.object({
    body: zod_1.z.object({
        caption: zod_1.z.string().optional(),
        location: zod_1.z.string().optional(),
        tags: zod_1.z.string().optional(), // Changed to string to handle JSON parsing
    }),
});
// FIXED: Use correct Zod syntax for required fields
const updateCommentBody = zod_1.z.object({
    content: zod_1.z.string()
        .min(1, "Comment content is required")
        .max(500, "Comment cannot exceed 500 characters"),
});
// FIXED: Proper params validation
const updateComment = zod_1.z.object({
    body: updateCommentBody,
});
// FIXED: For delete comment route
const deleteComment = zod_1.z.object({});
exports.MediaValidation = {
    createMediaPost,
    addComment,
    updateMediaPost,
    updateComment, // Use the combined validation
    deleteComment, // For delete route
};
