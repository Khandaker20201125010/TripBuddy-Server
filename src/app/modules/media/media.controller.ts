import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { MediaService } from "./media.services";
import pick from "../../helper/pick";
import { mediaFilterableFields } from "./media.constant";


const createMediaPost = catchAsync(async (req: Request & { user?: any }, res: Response) => {
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
    req.file!
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Media post created successfully",
    data: result,
  });
});

const getAllMediaPosts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, mediaFilterableFields);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  
  const currentUserId = (req as any).user?.id;

  const result = await MediaService.getAllMediaPosts(
    filters,
    options,
    currentUserId
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
    const { id } = req.params;
    const userId = req.user.id;

    const result = await MediaService.toggleLike(id, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.liked
        ? "Post liked successfully"
        : "Post unliked successfully",
      data: result,
    });
  }
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
  }
);

const shareMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await MediaService.shareMediaPost(id, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Post shared successfully",
      data: result,
    });
  }
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
  }
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
  }
);
const updateMediaPost = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { caption, location, tags } = req.body;

    const result = await MediaService.updateMediaPost(id, userId, {
      caption,
      location,
      tags: tags ? JSON.parse(tags) : [],
    }, req.file); // Pass the file if it exists

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Media post updated successfully",
      data: result,
    });
  }
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
};