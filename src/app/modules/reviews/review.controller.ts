import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { ReviewService } from "./review.services";
import pick from "../../helper/pick";
import { reviewFilterableFields } from "./review.constant";


const createReview = catchAsync(async (req: any, res) => {
  const result = await ReviewService.createReview(req.body, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const getAllReviews = catchAsync(async (req, res) => {
  const filters = pick(req.query, reviewFilterableFields);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await ReviewService.getAllReviews(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleReview = catchAsync(async (req, res) => {
  const result = await ReviewService.getSingleReview(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review retrieved successfully",
    data: result,
  });
});

const updateReview = catchAsync(async (req: any, res) => {
  const result = await ReviewService.updateReview(req.params.id, req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: any, res) => {
  const result = await ReviewService.deleteReview(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});
const getPendingReview = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;

  // If for some reason auth middleware passed but user is missing
  if (!user?.id) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "No user found",
      data: null,
    });
  }

  const result = await ReviewService.getPendingReview(user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending review fetched successfully",
    data: result,
  });
});


export const ReviewController = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getPendingReview
};
