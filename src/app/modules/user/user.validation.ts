import { z } from "zod";

 const createUserValidation = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    profileImage: z.string().optional(),
  }),
});

 const updateUserValidation = z.object({
  body: z.object({
    name: z.string().optional(),
    bio: z.string().optional(),
    profileImage: z.string().optional(),
    interests: z.array(z.string()).optional(),
    visitedCountries: z.array(z.string()).optional(),
  }),
});

 const loginValidation = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});
const createAdminValidationSchema = z.object({
    password: z.string({
        error: "Password is required"
    }),
    admin: z.object({
        name: z.string({
            error: "Name is required!"
        }),
        email: z.string({
            error: "Email is required!"
        }),
        contactNumber: z.string({
            error: "Contact Number is required!"
        })
    })
});
export const UserValidation ={
  createUserValidation,
  updateUserValidation,
  createAdminValidationSchema,
  loginValidation,
}