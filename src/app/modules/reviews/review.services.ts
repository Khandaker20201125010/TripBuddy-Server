import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { Prisma } from "@prisma/client";
import { IOptions, paginationHelper } from "../../helper/paginationHelper";
import { reviewSearchableFields } from "./review.constant";

const createReview = async (payload: any, reviewerId: string) => {
  const travelPlan = await prisma.travelPlan.findUnique({
    where: { id: payload.travelPlanId },
  });

  if (!travelPlan) throw new ApiError(httpStatus.NOT_FOUND, "Travel plan not found");

  // 1. Check if the trip has actually ended
  const now = new Date();
  if (new Date(travelPlan.endDate) > now) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You can only review a trip after it has ended.");
  }
  
  const revieweeId = travelPlan.userId;

  // 2. Prevent Self-Review
  if (revieweeId === reviewerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot review your own travel plan");
  }

  // 3. STRICT CHECK: Is the user an APPROVED buddy for THIS trip?
  const isBuddy = await prisma.travelBuddy.findFirst({
    where: {
      travelPlanId: payload.travelPlanId,
      userId: reviewerId,
      status: 'APPROVED' 
    }
  });

  if (!isBuddy) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only travelers who were APPROVED for this trip can leave a review.");
  }

  // 4. Prevent Duplicate Reviews
  const existingReview = await prisma.review.findFirst({
    where: {
      travelPlanId: payload.travelPlanId,
      reviewerId: reviewerId
    }
  });

  if (existingReview) {
    throw new ApiError(httpStatus.CONFLICT, "You have already reviewed this travel plan");
  }

  // 5. Transaction: Create Review & Update Average Rating
  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        reviewerId,
        revieweeId,
        travelPlanId: payload.travelPlanId,
        rating: Number(payload.rating),
        content: payload.content,
      },
    });

    const avgRating = await tx.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true }
    });

    await tx.user.update({
      where: { id: revieweeId },
      data: { rating: avgRating._avg.rating || 0 }
    });

    return review;
  });

  return result;
};

const getAllReviews = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, ...filterData } = params;
  const andConditions: Prisma.ReviewWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: reviewSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({ [key]: filterData[key] })),
    });
  }

  const whereConditions: Prisma.ReviewWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.review.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: { [sortBy]: sortOrder },
    include: {
      reviewer: true,
      travelPlan: true,
    },
  });

  const total = await prisma.review.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const getSingleReview = async (id: string) => {
  const review = await prisma.review.findUnique({
    where: { id },
    include: { reviewer: true, travelPlan: true },
  });
  if (!review) throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  return review;
};

const updateReview = async (id: string, reviewerId: string, payload: any) => {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  if (existing.reviewerId !== reviewerId)
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized to update this review");

  return prisma.review.update({ where: { id }, data: payload });
};

const deleteReview = async (id: string, reviewerId: string) => {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  if (existing.reviewerId !== reviewerId)
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized to delete this review");

  await prisma.review.delete({ where: { id } });
  return { message: "Review deleted successfully" };
};
const getPendingReview = async (userId: string) => {
  const now = new Date();

  // 1. Find a trip where:
  // - It has ended
  // - User is an APPROVED buddy
  // - User has NOT created a review for it yet
  const pendingTrip = await prisma.travelPlan.findFirst({
    where: {
      endDate: { lt: now }, // Trip is over
      buddies: {
        some: {
          userId: userId,
          status: "APPROVED"
        }
      },
      reviews: {
        none: {
          reviewerId: userId // No review by me
        }
      }
    },
    include: {
      user: true // Include host details for the modal
    }
  });

  return pendingTrip;
};
export const ReviewService = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getPendingReview
};