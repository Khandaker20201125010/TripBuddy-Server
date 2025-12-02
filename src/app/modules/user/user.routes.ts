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
    auth(Role.ADMIN),
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

// PROFILE
router.get("/:id", UserController.getUserProfile);

// UPDATE
router.patch(
  "/:id",
  validateRequest(UserValidation.updateUserValidation),
  UserController.updateUserProfile
);

export const UserRoutes = router;
