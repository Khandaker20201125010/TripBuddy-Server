import express, { NextFunction, Request, Response } from "express";
import {
  UserValidation,
} from "./user.validation";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../helper/fileUploader";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";

const router = express.Router();


router.get(
    "/",
    auth(Role.ADMIN,Role.USER),
    UserController.getAllUsers
)
router.post(
    "/create-admin",
    auth(Role.ADMIN),
    fileUploader.upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = UserValidation.createAdminValidationSchema.parse(JSON.parse(req.body.data))
        return UserController.createAdmin(req, res, next)
    }
);


// REGISTER (supports file)
router.post(
  "/register",
  fileUploader.upload.single("file"),
  validateRequest(UserValidation.createUserValidation),
  UserController.registerUser
);

router.get("/top-rated", UserController.getTopRatedTravelers);
router.get("/recently-active", UserController.getRecentlyActiveUsers);
router.get("/stats/regions", UserController.getRegionStats);
// PROFILE
router.get("/:id", UserController.getUserProfile);

router.get(
  "/admin/stats",
  auth(Role.ADMIN), // Strictly protected
  UserController.getAdminDashboardStats
);

// UPDATE
router.patch(
  "/:id",
  fileUploader.upload.single("file"),   
  validateRequest(UserValidation.updateUserValidation),
  UserController.updateUserProfile
);

export const UserRoutes = router;
