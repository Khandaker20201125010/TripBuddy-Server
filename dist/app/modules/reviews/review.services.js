"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const paginationHelper_1 = require("../../helper/paginationHelper");
const review_constant_1 = require("./review.constant");
const createReview = (payload, reviewerId) => __awaiter(void 0, void 0, void 0, function* () {
    const travelPlan = yield prisma_1.prisma.travelPlan.findUnique({
        where: { id: payload.travelPlanId },
    });
    if (!travelPlan)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Travel plan not found");
    // 1. Check if the trip has actually ended
    const now = new Date();
    if (new Date(travelPlan.endDate) > now) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "You can only review a trip after it has ended.");
    }
    const revieweeId = travelPlan.userId;
    // 2. Prevent Self-Review
    if (revieweeId === reviewerId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "You cannot review your own travel plan");
    }
    // 3. STRICT CHECK: Is the user an APPROVED buddy for THIS trip?
    const isBuddy = yield prisma_1.prisma.travelBuddy.findFirst({
        where: {
            travelPlanId: payload.travelPlanId,
            userId: reviewerId,
            status: 'APPROVED'
        }
    });
    if (!isBuddy) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only travelers who were APPROVED for this trip can leave a review.");
    }
    // 4. Prevent Duplicate Reviews
    const existingReview = yield prisma_1.prisma.review.findFirst({
        where: {
            travelPlanId: payload.travelPlanId,
            reviewerId: reviewerId
        }
    });
    if (existingReview) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "You have already reviewed this travel plan");
    }
    // 5. Transaction: Create Review & Update Average Rating
    const result = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const review = yield tx.review.create({
            data: {
                reviewerId,
                revieweeId,
                travelPlanId: payload.travelPlanId,
                rating: Number(payload.rating),
                content: payload.content,
            },
        });
        const avgRating = yield tx.review.aggregate({
            where: { revieweeId },
            _avg: { rating: true }
        });
        yield tx.user.update({
            where: { id: revieweeId },
            data: { rating: avgRating._avg.rating || 0 }
        });
        return review;
    }));
    return result;
});
const getAllReviews = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm } = params, filterData = __rest(params, ["searchTerm"]);
    const andConditions = [];
    if (searchTerm) {
        andConditions.push({
            OR: review_constant_1.reviewSearchableFields.map((field) => ({
                [field]: { contains: searchTerm, mode: "insensitive" },
            })),
        });
    }
    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({ [key]: filterData[key] })),
        });
    }
    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};
    const result = yield prisma_1.prisma.review.findMany({
        skip,
        take: limit,
        where: whereConditions,
        orderBy: { [sortBy]: sortOrder },
        // SECURE SELECTION: Only select safe fields for public display
        select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                    // Removed email, password, role, etc.
                },
            },
            travelPlan: {
                select: {
                    id: true,
                    destination: true,
                    startDate: true,
                    endDate: true,
                },
            },
        },
    });
    const total = yield prisma_1.prisma.review.count({ where: whereConditions });
    return {
        meta: { page, limit, total },
        data: result,
    };
});
const getSingleReview = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield prisma_1.prisma.review.findUnique({
        where: { id },
        include: { reviewer: true, travelPlan: true },
    });
    if (!review)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Review not found");
    return review;
});
const updateReview = (id, reviewerId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma_1.prisma.review.findUnique({ where: { id } });
    if (!existing)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Review not found");
    if (existing.reviewerId !== reviewerId)
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Unauthorized to update this review");
    return prisma_1.prisma.review.update({ where: { id }, data: payload });
});
const deleteReview = (id, reviewerId) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma_1.prisma.review.findUnique({ where: { id } });
    if (!existing)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Review not found");
    if (existing.reviewerId !== reviewerId)
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Unauthorized to delete this review");
    yield prisma_1.prisma.review.delete({ where: { id } });
    return { message: "Review deleted successfully" };
});
const getPendingReview = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const pendingTrip = yield prisma_1.prisma.travelPlan.findFirst({
        where: {
            endDate: { lt: now }, // Trip has ended
            buddies: {
                some: {
                    userId: userId,
                    status: "APPROVED"
                }
            },
            reviews: {
                none: {
                    reviewerId: userId
                }
            }
        },
        include: {
            // Use select inside include for the host details to prevent deep nesting issues
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true
                }
            }
        }
    });
    return pendingTrip;
});
exports.ReviewService = {
    createReview,
    getAllReviews,
    getSingleReview,
    updateReview,
    deleteReview,
    getPendingReview
};
