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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const fileUploader_1 = require("../../helper/fileUploader");
const paginationHelper_1 = require("../../helper/paginationHelper");
const createMediaPost = (userId, data, file) => __awaiter(void 0, void 0, void 0, function* () {
    if (!file) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Image file is required");
    }
    // Upload to Cloudinary
    const uploadResult = yield fileUploader_1.fileUploader.uploadToCloudinary(file);
    // Create media post
    const mediaPost = yield prisma_1.prisma.mediaPost.create({
        data: {
            userId,
            caption: data.caption,
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            location: data.location,
            tags: data.tags || [],
            travelPlanId: data.travelPlanId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                },
            },
            travelPlan: {
                select: {
                    id: true,
                    destination: true,
                },
            },
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    return mediaPost;
});
const getAllMediaPosts = (filters, options, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm, userId: filterUserId, travelPlanId, tags } = filters;
    const whereConditions = {};
    // Filter by user ID
    if (filterUserId) {
        whereConditions.userId = filterUserId;
    }
    // Filter by travel plan ID
    if (travelPlanId) {
        whereConditions.travelPlanId = travelPlanId;
    }
    // Filter by tags
    if (tags && Array.isArray(tags)) {
        whereConditions.tags = {
            hasSome: tags,
        };
    }
    // Search by caption or location
    if (searchTerm) {
        whereConditions.OR = [
            { caption: { contains: searchTerm, mode: "insensitive" } },
            { location: { contains: searchTerm, mode: "insensitive" } },
        ];
    }
    // Fetch media posts
    const mediaPosts = yield prisma_1.prisma.mediaPost.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                },
            },
            travelPlan: {
                select: {
                    id: true,
                    destination: true,
                },
            },
            likes: currentUserId
                ? {
                    where: { userId: currentUserId },
                    select: { id: true },
                }
                : false,
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    // Format response
    const formattedPosts = mediaPosts.map((post) => (Object.assign(Object.assign({}, post), { likesCount: post._count.likes, commentsCount: post._count.comments, sharesCount: post._count.shares, isLiked: currentUserId
            ? post.likes && post.likes.length > 0
            : false, _count: undefined, likes: undefined })));
    const total = yield prisma_1.prisma.mediaPost.count({ where: whereConditions });
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: formattedPosts,
    };
});
const getMediaPostById = (id, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const mediaPost = yield prisma_1.prisma.mediaPost.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                    bio: true,
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
            likes: currentUserId
                ? {
                    where: { userId: currentUserId },
                    select: { id: true },
                }
                : false,
            comments: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profileImage: true,
                        },
                    },
                    replies: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    profileImage: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    if (!mediaPost) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Media post not found");
    }
    return Object.assign(Object.assign({}, mediaPost), { likesCount: mediaPost._count.likes, commentsCount: mediaPost._count.comments, sharesCount: mediaPost._count.shares, isLiked: currentUserId
            ? mediaPost.likes && mediaPost.likes.length > 0
            : false, _count: undefined, likes: undefined });
});
const toggleLike = (mediaPostId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const existingLike = yield prisma_1.prisma.like.findUnique({
        where: {
            userId_mediaPostId: {
                userId,
                mediaPostId,
            },
        },
    });
    if (existingLike) {
        // Unlike
        yield prisma_1.prisma.like.delete({
            where: { id: existingLike.id },
        });
        // Decrement likes count
        yield prisma_1.prisma.mediaPost.update({
            where: { id: mediaPostId },
            data: {
                likesCount: { decrement: 1 },
            },
        });
        return { liked: false };
    }
    else {
        // Like
        yield prisma_1.prisma.like.create({
            data: {
                userId,
                mediaPostId,
            },
        });
        // Increment likes count
        yield prisma_1.prisma.mediaPost.update({
            where: { id: mediaPostId },
            data: {
                likesCount: { increment: 1 },
            },
        });
        return { liked: true };
    }
});
const addComment = (mediaPostId, userId, content, parentId) => __awaiter(void 0, void 0, void 0, function* () {
    const comment = yield prisma_1.prisma.comment.create({
        data: {
            userId,
            mediaPostId,
            content,
            parentId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                },
            },
        },
    });
    // Increment comments count
    yield prisma_1.prisma.mediaPost.update({
        where: { id: mediaPostId },
        data: {
            commentsCount: { increment: 1 },
        },
    });
    return comment;
});
const shareMediaPost = (mediaPostId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const existingShare = yield prisma_1.prisma.share.findUnique({
        where: {
            userId_mediaPostId: {
                userId,
                mediaPostId,
            },
        },
    });
    if (existingShare) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Already shared this post");
    }
    const share = yield prisma_1.prisma.share.create({
        data: {
            userId,
            mediaPostId,
        },
    });
    // Increment shares count
    yield prisma_1.prisma.mediaPost.update({
        where: { id: mediaPostId },
        data: {
            sharesCount: { increment: 1 },
        },
    });
    return share;
});
const deleteMediaPost = (mediaPostId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const mediaPost = yield prisma_1.prisma.mediaPost.findUnique({
        where: { id: mediaPostId },
        include: { user: true },
    });
    if (!mediaPost) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Media post not found");
    }
    // Check if user owns the post
    if (mediaPost.userId !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You can only delete your own posts");
    }
    // Delete from Cloudinary
    if (mediaPost.publicId) {
        yield fileUploader_1.fileUploader.deleteFromCloudinary(mediaPost.publicId);
    }
    // Delete from database
    yield prisma_1.prisma.mediaPost.delete({
        where: { id: mediaPostId },
    });
    return { success: true };
});
const getUserMediaPosts = (userId, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const mediaPosts = yield prisma_1.prisma.mediaPost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                },
            },
            likes: currentUserId
                ? {
                    where: { userId: currentUserId },
                    select: { id: true },
                }
                : false,
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    return mediaPosts.map((post) => (Object.assign(Object.assign({}, post), { likesCount: post._count.likes, commentsCount: post._count.comments, sharesCount: post._count.shares, isLiked: currentUserId
            ? post.likes && post.likes.length > 0
            : false, _count: undefined, likes: undefined })));
});
const updateMediaPost = (mediaPostId, userId, data, file) => __awaiter(void 0, void 0, void 0, function* () {
    const mediaPost = yield prisma_1.prisma.mediaPost.findUnique({
        where: { id: mediaPostId },
        include: { user: true },
    });
    if (!mediaPost) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Media post not found");
    }
    // Check if user owns the post
    if (mediaPost.userId !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You can only edit your own posts");
    }
    let newImageUrl = mediaPost.imageUrl;
    let newPublicId = mediaPost.publicId;
    // If new image is provided, upload it and delete old one
    if (file) {
        // Upload new image to Cloudinary
        const uploadResult = yield fileUploader_1.fileUploader.uploadToCloudinary(file);
        newImageUrl = uploadResult.secure_url;
        newPublicId = uploadResult.public_id;
        // Delete old image from Cloudinary
        if (mediaPost.publicId) {
            yield fileUploader_1.fileUploader.deleteFromCloudinary(mediaPost.publicId);
        }
    }
    const updatedMediaPost = yield prisma_1.prisma.mediaPost.update({
        where: { id: mediaPostId },
        data: {
            caption: data.caption,
            location: data.location,
            tags: data.tags || [],
            imageUrl: newImageUrl,
            publicId: newPublicId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                },
            },
            travelPlan: {
                select: {
                    id: true,
                    destination: true,
                },
            },
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    return Object.assign(Object.assign({}, updatedMediaPost), { likesCount: updatedMediaPost._count.likes, commentsCount: updatedMediaPost._count.comments, sharesCount: updatedMediaPost._count.shares, _count: undefined });
});
exports.MediaService = {
    createMediaPost,
    getAllMediaPosts,
    getMediaPostById,
    toggleLike,
    addComment,
    shareMediaPost,
    deleteMediaPost,
    getUserMediaPosts,
    updateMediaPost,
};
