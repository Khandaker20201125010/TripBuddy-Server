import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { Prisma } from "@prisma/client";
import { IOptions, paginationHelper } from "../../helper/paginationHelper";
import { reviewSearchableFields } from "./review.constant";


const createReview = async (payload: any, reviewerId: string) => {
  // Find travel plan owner
  const travelPlan = await prisma.travelPlan.findUnique({
    where: { id: payload.travelPlanId },
  });

  if (!travelPlan) throw new ApiError(404, "Travel plan not found");

  const revieweeId = travelPlan.userId; // owner of the travel plan

  const review = await prisma.review.create({
    data: {
      reviewerId,
      revieweeId,
      travelPlanId: payload.travelPlanId,
      rating: payload.rating,
      content: payload.content,
    },
  });

  return review;
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
  if (!existing) throw new ApiError(404, "Review not found");
  if (existing.reviewerId !== reviewerId)
    throw new ApiError(403, "Unauthorized to update this review");

  return prisma.review.update({ where: { id }, data: payload });
};

const deleteReview = async (id: string, reviewerId: string) => {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Review not found");
  if (existing.reviewerId !== reviewerId)
    throw new ApiError(403, "Unauthorized to delete this review");

  await prisma.review.delete({ where: { id } });
  return { message: "Review deleted successfully" };
};

export const ReviewService = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
};
