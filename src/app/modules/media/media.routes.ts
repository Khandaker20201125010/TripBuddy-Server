import express from "express";
import { MediaController } from "./media.controller";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";
import { fileUploader } from "../../helper/fileUploader";
import validateRequest from "../../middlewares/validateRequest";
import { MediaValidation } from "./media.validation";

const router = express.Router();

// Create media post
router.post(
  "/",
  auth(Role.USER, Role.ADMIN),
  fileUploader.upload.single("image"),
  validateRequest(MediaValidation.createMediaPost),
  MediaController.createMediaPost
);

// Get all media posts
router.get(
  "/",
  auth(Role.USER, Role.ADMIN),
  MediaController.getAllMediaPosts
);

// Get media post by ID
router.get(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  MediaController.getMediaPost
);

// Get user's media posts
router.get("/user/:userId", MediaController.getUserMediaPosts);

// Toggle like
router.post(
  "/:id/like",
  auth(Role.USER, Role.ADMIN),
  MediaController.toggleLikeMediaPost
);

// Add comment
router.post(
  "/:id/comment",
  auth(Role.USER, Role.ADMIN),
  validateRequest(MediaValidation.addComment),
  MediaController.addCommentToMediaPost
);

// FIXED: Update comment route with proper validation
router.patch(
  "/:postId/comment/:commentId",
  auth(Role.USER, Role.ADMIN),
  validateRequest(MediaValidation.updateComment),
  MediaController.updateComment
);
// FIXED: Delete comment route with proper validation
router.delete(
  "/:postId/comment/:commentId",
  auth(Role.USER, Role.ADMIN),
  validateRequest(MediaValidation.deleteComment),
  MediaController.deleteComment
);

// Share post
router.post(
  "/:id/share",
  auth(Role.USER, Role.ADMIN),
  MediaController.shareMediaPost
);

// Update media post
router.patch(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  fileUploader.upload.single("image"), 
  validateRequest(MediaValidation.updateMediaPost),
  MediaController.updateMediaPost
);

// Delete media post
router.delete(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  MediaController.deleteMediaPost
);

export const MediaRoutes = router;