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
// backend/src/modules/media/media.services.ts
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
    // Fetch media posts with user info and counts
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
            // Count likes, comments, and shares
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    console.log(`📊 Found ${mediaPosts.length} media posts for user: ${currentUserId || 'not logged in'}`);
    // FIXED: Get all like statuses for current user in a single query
    let userLikes = [];
    if (currentUserId) {
        try {
            console.log(`🔍 Checking likes for user ${currentUserId}`);
            const likedPosts = yield prisma_1.prisma.like.findMany({
                where: {
                    userId: currentUserId,
                    mediaPostId: {
                        in: mediaPosts.map(post => post.id)
                    }
                },
                select: {
                    mediaPostId: true
                }
            });
            console.log(`❤️ User ${currentUserId} has liked ${likedPosts.length} posts out of ${mediaPosts.length}`);
            userLikes = likedPosts.map(like => like.mediaPostId);
            // Debug: Log which posts are liked
            if (likedPosts.length > 0) {
                console.log('📝 Liked post IDs:', userLikes);
            }
        }
        catch (error) {
            console.error('❌ Error fetching user likes:', error);
        }
    }
    else {
        console.log('👤 No current user ID provided, showing all posts as unliked');
    }
    // Format response with detailed logging
    const formattedPosts = mediaPosts.map((post) => {
        const isLiked = currentUserId ? userLikes.includes(post.id) : false;
        // Debug log for each post
        console.log(`🖼️ Post ${post.id}: isLiked = ${isLiked}, total likes = ${post._count.likes}`);
        return {
            id: post.id,
            userId: post.userId,
            caption: post.caption,
            imageUrl: post.imageUrl,
            location: post.location,
            tags: post.tags || [],
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            sharesCount: post._count.shares,
            type: post.type,
            travelPlanId: post.travelPlanId,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            isLiked: isLiked,
            user: post.user,
            travelPlan: post.travelPlan
        };
    });
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
            // Get all comments
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
            // Count likes, comments, and shares
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
    // Check if current user has liked this post
    let isLiked = false;
    if (currentUserId) {
        const userLike = yield prisma_1.prisma.like.findUnique({
            where: {
                userId_mediaPostId: {
                    userId: currentUserId,
                    mediaPostId: id,
                },
            },
        });
        isLiked = !!userLike;
    }
    return Object.assign(Object.assign({}, mediaPost), { likesCount: mediaPost._count.likes, commentsCount: mediaPost._count.comments, sharesCount: mediaPost._count.shares, isLiked, _count: undefined });
});
// backend/src/modules/media/media.services.ts - Simplified toggleLike function
const toggleLike = (mediaPostId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Check if media post exists
        const mediaPost = yield prisma_1.prisma.mediaPost.findUnique({
            where: { id: mediaPostId },
        });
        if (!mediaPost) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Media post not found");
        }
        // Check if user already liked this post
        const existingLike = yield prisma_1.prisma.like.findUnique({
            where: {
                userId_mediaPostId: {
                    userId,
                    mediaPostId,
                },
            },
        });
        let action;
        let liked;
        let likesCount;
        if (existingLike) {
            // UNLIKE - Delete the existing like
            yield prisma_1.prisma.like.delete({
                where: {
                    userId_mediaPostId: {
                        userId,
                        mediaPostId,
                    },
                },
            });
            // Update likes count
            likesCount = Math.max(0, mediaPost.likesCount - 1);
            yield prisma_1.prisma.mediaPost.update({
                where: { id: mediaPostId },
                data: {
                    likesCount: likesCount,
                },
            });
            action = "unliked";
            liked = false;
        }
        else {
            // LIKE - Create new like
            yield prisma_1.prisma.like.create({
                data: {
                    userId,
                    mediaPostId,
                },
            });
            // Update likes count
            likesCount = mediaPost.likesCount + 1;
            yield prisma_1.prisma.mediaPost.update({
                where: { id: mediaPostId },
                data: {
                    likesCount: likesCount,
                },
            });
            action = "liked";
            liked = true;
        }
        // Get the updated media post with proper includes
        const updatedMediaPost = yield prisma_1.prisma.mediaPost.findUnique({
            where: { id: mediaPostId },
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
                likes: {
                    where: { userId },
                    select: { id: true, userId: true },
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
        // Format the media post for response
        const formattedMediaPost = updatedMediaPost ? Object.assign(Object.assign({}, updatedMediaPost), { likesCount: updatedMediaPost._count.likes, commentsCount: updatedMediaPost._count.comments, sharesCount: updatedMediaPost._count.shares, isLiked: updatedMediaPost.likes && updatedMediaPost.likes.length > 0, _count: undefined, likes: undefined }) : null;
        return {
            success: true,
            liked,
            likesCount,
            action,
            message: action === "liked" ? "Photo liked!" : "Photo unliked",
            mediaPost: formattedMediaPost
        };
    }
    catch (error) {
        console.error("Error in toggleLike:", error);
        // Handle specific errors
        if (error.code === "P2025") {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Media post not found");
        }
        if (error.code === "P2002") {
            const currentMediaPost = yield prisma_1.prisma.mediaPost.findUnique({
                where: { id: mediaPostId },
                include: {
                    likes: {
                        where: { userId },
                        select: { id: true },
                    },
                },
            });
            if (!currentMediaPost) {
                throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Media post not found");
            }
            return {
                success: true,
                liked: true,
                likesCount: currentMediaPost.likesCount,
                action: "already_liked",
                message: "You already liked this post",
                mediaPost: currentMediaPost
            };
        }
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to process like");
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
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    shares: true,
                },
            },
        },
    });
    console.log(`📊 Found ${mediaPosts.length} media posts for user ${userId}, checking likes for user ${currentUserId || 'not logged in'}`);
    // Get all like statuses for current user
    let userLikes = [];
    if (currentUserId) {
        try {
            const likedPosts = yield prisma_1.prisma.like.findMany({
                where: {
                    userId: currentUserId,
                    mediaPostId: {
                        in: mediaPosts.map(post => post.id)
                    }
                },
                select: {
                    mediaPostId: true
                }
            });
            userLikes = likedPosts.map(like => like.mediaPostId);
            console.log(`❤️ User ${currentUserId} has liked ${likedPosts.length} of user ${userId}'s posts`);
        }
        catch (error) {
            console.error('❌ Error fetching user likes in getUserMediaPosts:', error);
        }
    }
    return mediaPosts.map((post) => {
        const isLiked = currentUserId ? userLikes.includes(post.id) : false;
        // Debug log
        console.log(`🖼️ User ${userId}'s Post ${post.id}: isLiked = ${isLiked}`);
        return Object.assign(Object.assign({}, post), { likesCount: post._count.likes, commentsCount: post._count.comments, sharesCount: post._count.shares, isLiked: isLiked, _count: undefined });
    });
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
const updateComment = (postId, commentId, userId, content) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`🔄 Updating comment: post=${postId}, comment=${commentId}, user=${userId}`);
        // Verify the comment exists and belongs to the post
        const comment = yield prisma_1.prisma.comment.findFirst({
            where: {
                id: commentId,
                mediaPostId: postId
            },
            include: {
                user: true
            }
        });
        if (!comment) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, `Comment ${commentId} not found in post ${postId}`);
        }
        // Check ownership
        if (comment.userId !== userId) {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You can only edit your own comments");
        }
        const updatedComment = yield prisma_1.prisma.comment.update({
            where: {
                id: commentId
            },
            data: {
                content,
                updatedAt: new Date()
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
        console.log(`✅ Comment updated successfully`);
        return updatedComment;
    }
    catch (error) {
        console.error("❌ Error updating comment:", error);
        if (error.code === 'P2025') {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Comment not found");
        }
        throw error;
    }
});
const deleteComment = (postId, commentId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`🗑️ Deleting comment: post=${postId}, comment=${commentId}, user=${userId}`);
        // Find the comment and verify it belongs to the post
        const comment = yield prisma_1.prisma.comment.findFirst({
            where: {
                id: commentId,
                mediaPostId: postId
            },
            include: {
                user: true,
                mediaPost: true
            }
        });
        if (!comment) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, `Comment ${commentId} not found in post ${postId}`);
        }
        // Check ownership
        if (comment.userId !== userId) {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You can only delete your own comments");
        }
        // Delete the comment
        yield prisma_1.prisma.comment.delete({
            where: {
                id: commentId
            }
        });
        // Decrement comments count
        yield prisma_1.prisma.mediaPost.update({
            where: {
                id: postId
            },
            data: {
                commentsCount: { decrement: 1 }
            }
        });
        console.log(`✅ Comment deleted successfully`);
        return { success: true };
    }
    catch (error) {
        console.error("❌ Error deleting comment:", error);
        if (error.code === 'P2025') {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Comment not found");
        }
        throw error;
    }
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
    updateComment,
    deleteComment,
};
