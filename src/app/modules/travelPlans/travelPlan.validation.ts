// travelPlan.validation.ts
import { z } from "zod";

export const TravelPlanValidation = {
  create: z.object({
    body: z.object({
      destination: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      budget: z.coerce.number(),
      travelType: z.string(),
      description: z.string().optional(),
      visibility: z
        .union([z.boolean(), z.string()])
        .transform(v => v === true || v === "true")
        .optional(),
    }),
  }),

  update: z.object({
    body: z.object({
      destination: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      budget: z.coerce.number().optional(),
      travelType: z.string().optional(),
      description: z.string().optional(),
      visibility: z
        .union([z.boolean(), z.string()])
        .transform(v => v === true || v === "true")
        .optional(),
      image: z.string().optional(),
    }),
  }),
};
