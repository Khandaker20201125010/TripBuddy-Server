import { z } from "zod";

const createMediaPost = z.object({
  body: z.object({
    caption: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional(),
    travelPlanId: z.string().optional(),
  }),
});

const addComment = z.object({
  body: z.object({
    content: z.string().min(1, "Comment content is required"),
    parentId: z.string().optional(),
  }),
});

const updateMediaPost = z.object({
  body: z.object({
    caption: z.string().optional(),
    location: z.string().optional(),
    tags: z.string().optional(), // Changed to string to handle JSON parsing
  }),
});

// FIXED: Use correct Zod syntax for required fields
const updateCommentBody = z.object({
  content: z.string()
    .min(1, "Comment content is required")
    .max(500, "Comment cannot exceed 500 characters"),
});

// FIXED: Proper params validation
const updateComment = z.object({
  body: updateCommentBody,
});



// FIXED: For delete comment route
const deleteComment = z.object({});

export const MediaValidation = {
  createMediaPost,
  addComment,
  updateMediaPost,
  updateComment, // Use the combined validation
  deleteComment, // For delete route
};