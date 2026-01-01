import express from "express";
import { ReviewController } from "./review.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewValidation } from "./review.validation";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";

const router = express.Router();


router.get(
  "/pending", 
  auth(Role.USER, Role.ADMIN), 
  ReviewController.getPendingReview
);

router.get("/", ReviewController.getAllReviews);
router.get("/:id", ReviewController.getSingleReview);


router.use(auth(Role.USER));



router.post(
  "/",
  validateRequest(ReviewValidation.createReviewValidation),
  ReviewController.createReview
);

router.patch(
  "/:id",
  validateRequest(ReviewValidation.updateReviewValidation),
  ReviewController.updateReview
);

router.delete("/:id", ReviewController.deleteReview);

export const ReviewRoutes = router;