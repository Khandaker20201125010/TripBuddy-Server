import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { MediaService } from "./media.services";
import pick from "../../helper/pick";
import { mediaFilterableFields } from "./media.constant";
import ApiError from "../../middlewares/ApiError";

const createMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const mediaData = {
      caption: req.body.caption,
      location: req.body.location,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      travelPlanId: req.body.travelPlanId,
    };

    const result = await MediaService.createMediaPost(
      userId,
      mediaData,
      req.file!,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Media post created successfully",
      data: result,
    });
  },
);

const getAllMediaPosts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, mediaFilterableFields);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  // IMPORTANT: Make sure user ID is being passed correctly
  const currentUserId = (req as any).user?.id;

  console.log(
    `🎯 getAllMediaPosts called with user ID: ${currentUserId || "not authenticated"}`,
  );

  const result = await MediaService.getAllMediaPosts(
    filters,
    options,
    currentUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Media posts retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMediaPost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = (req as any).user?.id;

  const result = await MediaService.getMediaPostById(id, currentUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Media post retrieved successfully",
    data: result,
  });
});

const toggleLikeMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log("Controller toggleLikeMediaPost called:", { id, userId });

      const result = await MediaService.toggleLike(id, userId);

      console.log("Service result:", result);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
          result.message ||
          (result.liked
            ? "Post liked successfully"
            : "Post unliked successfully"),
        data: {
          liked: result.liked,
          likesCount: result.likesCount,
          action: result.action,
          mediaPost: result.mediaPost,
        },
      });
    } catch (error: any) {
      console.error("Controller toggleLikeMediaPost error:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Send proper error response
      sendResponse(res, {
        statusCode: error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        message: error.message || "Failed to process like",
        data: error.data || null,
      });
    }
  },
);

const addCommentToMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, parentId } = req.body;

    const result = await MediaService.addComment(id, userId, content, parentId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Comment added successfully",
      data: result,
    });
  },
);

const shareMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    console.log("Controller - Sharing post:", { id, userId });

    const result = await MediaService.shareMediaPost(id, userId);

    // Handle both response types
    const message = result.message || "Post shared successfully";
    const success = result.success !== false; // Default to true if not specified
    const alreadyShared = result.alreadyShared || false;

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: success,
      message: message,
      data: {
        success: success,
        message: message,
        alreadyShared: alreadyShared,
        share: result.share || result
      },
    });
  },
);

const deleteMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await MediaService.deleteMediaPost(id, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Media post deleted successfully",
      data: result,
    });
  },
);

const getUserMediaPosts = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const result = await MediaService.getUserMediaPosts(userId, currentUserId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User media posts retrieved successfully",
      data: result,
    });
  },
);
const updateMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { caption, location, tags } = req.body;

    const result = await MediaService.updateMediaPost(
      id,
      userId,
      {
        caption,
        location,
        tags: tags ? JSON.parse(tags) : [],
      },
      req.file,
    ); // Pass the file if it exists

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Media post updated successfully",
      data: result,
    });
  },
);
const updateComment = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    try {
      // Debug logging
      console.log("Update comment endpoint called:", {
        params: req.params,
        body: req.body,
        userId: req.user?.id
      });

      const { postId, commentId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      // Validate parameters exist
      if (!postId || !commentId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Missing postId or commentId in parameters");
      }

      // Validate content is provided
      if (!content || content.trim() === "") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Comment content is required");
      }

      // Call service with all required parameters
      const result = await MediaService.updateComment(postId, commentId, userId, content);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Comment updated successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Update comment controller error:", error);
      throw error;
    }
  },
);
const deleteComment = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    try {
      console.log("Delete comment endpoint called:", {
        params: req.params,
        userId: req.user?.id
      });

      const { postId, commentId } = req.params;
      const userId = req.user.id;

      // Validate parameters exist
      if (!postId || !commentId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Missing postId or commentId in parameters");
      }

      const result = await MediaService.deleteComment(postId, commentId, userId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Comment deleted successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Delete comment controller error:", error);
      throw error;
    }
  },
);

export const MediaController = {
  createMediaPost,
  getAllMediaPosts,
  getMediaPost,
  toggleLikeMediaPost,
  addCommentToMediaPost,
  shareMediaPost,
  deleteMediaPost,
  getUserMediaPosts,
  updateMediaPost,
  updateComment,
  deleteComment,
};
