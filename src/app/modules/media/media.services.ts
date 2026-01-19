// backend/src/modules/media/media.services.ts
import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { fileUploader } from "../../helper/fileUploader";
import { Prisma } from "@prisma/client";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";

interface CreateMediaPostData {
  caption?: string;
  location?: string;
  tags?: string[];
  travelPlanId?: string;
}

interface UpdateMediaPostData {
  caption?: string;
  location?: string;
  tags?: string[];
  image?: Express.Multer.File;
}

const createMediaPost = async (
  userId: string,
  data: CreateMediaPostData,
  file: Express.Multer.File,
) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Image file is required");
  }

  // Upload to Cloudinary
  const uploadResult = await fileUploader.uploadToCloudinary(file);

  // Create media post
  const mediaPost = await prisma.mediaPost.create({
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
};

const getAllMediaPosts = async (
  filters: any,
  options: IOptions,
  currentUserId?: string,
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const { searchTerm, userId: filterUserId, travelPlanId, tags } = filters;

  const whereConditions: Prisma.MediaPostWhereInput = {};

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
  const mediaPosts = await prisma.mediaPost.findMany({
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
  let userLikes: string[] = [];
  
  if (currentUserId) {
    try {
      console.log(`🔍 Checking likes for user ${currentUserId}`);
      
      const likedPosts = await prisma.like.findMany({
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
      
    } catch (error) {
      console.error('❌ Error fetching user likes:', error);
    }
  } else {
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

  const total = await prisma.mediaPost.count({ where: whereConditions });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: formattedPosts,
  };
};


const getMediaPostById = async (id: string, currentUserId?: string) => {
  const mediaPost = await prisma.mediaPost.findUnique({
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
    throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
  }

  // Check if current user has liked this post
  let isLiked = false;
  if (currentUserId) {
    const userLike = await prisma.like.findUnique({
      where: {
        userId_mediaPostId: {
          userId: currentUserId,
          mediaPostId: id,
        },
      },
    });
    isLiked = !!userLike;
  }

  return {
    ...mediaPost,
    likesCount: mediaPost._count.likes,
    commentsCount: mediaPost._count.comments,
    sharesCount: mediaPost._count.shares,
    isLiked,
    _count: undefined,
  };
};

// backend/src/modules/media/media.services.ts - Simplified toggleLike function
const toggleLike = async (mediaPostId: string, userId: string) => {
  try {
    // 1. Check if media post exists
    const mediaPost = await prisma.mediaPost.findUnique({
      where: { id: mediaPostId },
    });

    if (!mediaPost) {
      throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
    }

    // Check if user already liked this post
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_mediaPostId: {
          userId,
          mediaPostId,
        },
      },
    });

    let action: "liked" | "unliked";
    let liked: boolean;
    let likesCount: number;

    if (existingLike) {
      // UNLIKE - Delete the existing like
      await prisma.like.delete({
        where: {
          userId_mediaPostId: {
            userId,
            mediaPostId,
          },
        },
      });

      // Update likes count
      likesCount = Math.max(0, mediaPost.likesCount - 1);
      await prisma.mediaPost.update({
        where: { id: mediaPostId },
        data: {
          likesCount: likesCount,
        },
      });

      action = "unliked";
      liked = false;
    } else {
      // LIKE - Create new like
      await prisma.like.create({
        data: {
          userId,
          mediaPostId,
        },
      });

      // Update likes count
      likesCount = mediaPost.likesCount + 1;
      await prisma.mediaPost.update({
        where: { id: mediaPostId },
        data: {
          likesCount: likesCount,
        },
      });

      action = "liked";
      liked = true;
    }

    // Get the updated media post with proper includes
    const updatedMediaPost = await prisma.mediaPost.findUnique({
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
    const formattedMediaPost = updatedMediaPost ? {
      ...updatedMediaPost,
      likesCount: updatedMediaPost._count.likes,
      commentsCount: updatedMediaPost._count.comments,
      sharesCount: updatedMediaPost._count.shares,
      isLiked: updatedMediaPost.likes && updatedMediaPost.likes.length > 0,
      _count: undefined,
      likes: undefined,
    } : null;

    return {
      success: true,
      liked,
      likesCount,
      action,
      message: action === "liked" ? "Photo liked!" : "Photo unliked",
      mediaPost: formattedMediaPost
    };

  } catch (error: any) {
    console.error("Error in toggleLike:", error);

    // Handle specific errors
    if (error.code === "P2025") {
      throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
    }

    if (error.code === "P2002") {
      const currentMediaPost = await prisma.mediaPost.findUnique({
        where: { id: mediaPostId },
        include: {
          likes: {
            where: { userId },
            select: { id: true },
          },
        },
      });

      if (!currentMediaPost) {
        throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
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

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to process like",
    );
  }
};
const addComment = async (
  mediaPostId: string,
  userId: string,
  content: string,
  parentId?: string,
) => {
  const comment = await prisma.comment.create({
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
  await prisma.mediaPost.update({
    where: { id: mediaPostId },
    data: {
      commentsCount: { increment: 1 },
    },
  });

  return comment;
};

const shareMediaPost = async (mediaPostId: string, userId: string) => {
  const existingShare = await prisma.share.findUnique({
    where: {
      userId_mediaPostId: {
        userId,
        mediaPostId,
      },
    },
  });

  if (existingShare) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Already shared this post");
  }

  const share = await prisma.share.create({
    data: {
      userId,
      mediaPostId,
    },
  });

  // Increment shares count
  await prisma.mediaPost.update({
    where: { id: mediaPostId },
    data: {
      sharesCount: { increment: 1 },
    },
  });

  return share;
};

const deleteMediaPost = async (mediaPostId: string, userId: string) => {
  const mediaPost = await prisma.mediaPost.findUnique({
    where: { id: mediaPostId },
    include: { user: true },
  });

  if (!mediaPost) {
    throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
  }

  // Check if user owns the post
  if (mediaPost.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only delete your own posts",
    );
  }

  // Delete from Cloudinary
  if (mediaPost.publicId) {
    await fileUploader.deleteFromCloudinary(mediaPost.publicId);
  }

  // Delete from database
  await prisma.mediaPost.delete({
    where: { id: mediaPostId },
  });

  return { success: true };
};

const getUserMediaPosts = async (userId: string, currentUserId?: string) => {
  const mediaPosts = await prisma.mediaPost.findMany({
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
  let userLikes: string[] = [];
  
  if (currentUserId) {
    try {
      const likedPosts = await prisma.like.findMany({
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
      
    } catch (error) {
      console.error('❌ Error fetching user likes in getUserMediaPosts:', error);
    }
  }

  return mediaPosts.map((post) => {
    const isLiked = currentUserId ? userLikes.includes(post.id) : false;
    
    // Debug log
    console.log(`🖼️ User ${userId}'s Post ${post.id}: isLiked = ${isLiked}`);
    
    return {
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares,
      isLiked: isLiked,
      _count: undefined,
    };
  });
};

const updateMediaPost = async (
  mediaPostId: string,
  userId: string,
  data: UpdateMediaPostData,
  file?: Express.Multer.File,
) => {
  const mediaPost = await prisma.mediaPost.findUnique({
    where: { id: mediaPostId },
    include: { user: true },
  });

  if (!mediaPost) {
    throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
  }

  // Check if user owns the post
  if (mediaPost.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only edit your own posts",
    );
  }

  let newImageUrl = mediaPost.imageUrl;
  let newPublicId = mediaPost.publicId;

  // If new image is provided, upload it and delete old one
  if (file) {
    // Upload new image to Cloudinary
    const uploadResult = await fileUploader.uploadToCloudinary(file);
    newImageUrl = uploadResult.secure_url;
    newPublicId = uploadResult.public_id;

    // Delete old image from Cloudinary
    if (mediaPost.publicId) {
      await fileUploader.deleteFromCloudinary(mediaPost.publicId);
    }
  }

  const updatedMediaPost = await prisma.mediaPost.update({
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

  return {
    ...updatedMediaPost,
    likesCount: updatedMediaPost._count.likes,
    commentsCount: updatedMediaPost._count.comments,
    sharesCount: updatedMediaPost._count.shares,
    _count: undefined,
  };
};

const updateComment = async (
  postId: string,
  commentId: string,
  userId: string,
  content: string
) => {
  try {
    console.log(`🔄 Updating comment: post=${postId}, comment=${commentId}, user=${userId}`);
    
    // Verify the comment exists and belongs to the post
    const comment = await prisma.comment.findFirst({
      where: { 
        id: commentId,
        mediaPostId: postId
      },
      include: { 
        user: true 
      }
    });

    if (!comment) {
      throw new ApiError(
        httpStatus.NOT_FOUND, 
        `Comment ${commentId} not found in post ${postId}`
      );
    }

    // Check ownership
    if (comment.userId !== userId) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You can only edit your own comments"
      );
    }

    const updatedComment = await prisma.comment.update({
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
  } catch (error: any) {
    console.error("❌ Error updating comment:", error);
    
    if (error.code === 'P2025') {
      throw new ApiError(httpStatus.NOT_FOUND, "Comment not found");
    }
    
    throw error;
  }
};


const deleteComment = async (
  postId: string,
  commentId: string,
  userId: string
) => {
  try {
    console.log(`🗑️ Deleting comment: post=${postId}, comment=${commentId}, user=${userId}`);
    
    // Find the comment and verify it belongs to the post
    const comment = await prisma.comment.findFirst({
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
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Comment ${commentId} not found in post ${postId}`
      );
    }

    // Check ownership
    if (comment.userId !== userId) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You can only delete your own comments"
      );
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { 
        id: commentId 
      }
    });

    // Decrement comments count
    await prisma.mediaPost.update({
      where: { 
        id: postId 
      },
      data: {
        commentsCount: { decrement: 1 }
      }
    });

    console.log(`✅ Comment deleted successfully`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error deleting comment:", error);
    
    if (error.code === 'P2025') {
      throw new ApiError(httpStatus.NOT_FOUND, "Comment not found");
    }
    
    throw error;
  }
};

export const MediaService = {
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