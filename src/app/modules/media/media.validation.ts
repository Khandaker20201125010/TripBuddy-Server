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


export const MediaValidation = {
  createMediaPost,
  addComment,
  updateMediaPost,
};
