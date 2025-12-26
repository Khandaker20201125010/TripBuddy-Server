import express, { NextFunction, Request, Response } from "express";
import { UserValidation } from "./user.validation";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../helper/fileUploader";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";

const router = express.Router();

// --- ADMIN ROUTES ---
router.post(
    "/create-admin",
    auth(Role.ADMIN),
    fileUploader.upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = UserValidation.createAdminValidationSchema.parse(JSON.parse(req.body.data))
        return UserController.createAdmin(req, res, next)
    }
);

router.get(
  "/admin/stats",
  auth(Role.ADMIN),
  UserController.getAdminDashboardStats
);

// --- USER MANAGEMENT ---
router.post(
  "/register",
  fileUploader.upload.single("file"),
  validateRequest(UserValidation.createUserValidation),
  UserController.registerUser
);

router.get(
    "/",
    auth(Role.ADMIN, Role.USER),
    UserController.getAllUsers
);

// --- SPECIFIC PUBLIC ROUTES (MUST BE BEFORE /:id) ---
router.get("/top-rated", UserController.getTopRatedTravelers);
router.get("/recently-active", UserController.getRecentlyActiveUsers);
router.get("/stats/regions", UserController.getRegionStats);

// --- UPDATE PROFILE ---
router.patch(
  "/:id",
  auth(Role.ADMIN, Role.USER), 
  fileUploader.upload.single("file"),   
  validateRequest(UserValidation.updateUserValidation),
  UserController.updateUserProfile
);

// --- PUBLIC PROFILE VIEW (DYNAMIC ROUTE - MUST BE LAST) ---
// This handles requests like /user/123-abc-456
router.get("/:id", UserController.getUserProfile);

export const UserRoutes = router;