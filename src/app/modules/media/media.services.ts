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
  file: Express.Multer.File
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
  currentUserId?: string
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

  // Fetch media posts
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
  const formattedPosts = mediaPosts.map((post) => ({
    ...post,
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    sharesCount: post._count.shares,
    isLiked: currentUserId
      ? post.likes && post.likes.length > 0
      : false,
    _count: undefined,
    likes: undefined,
  }));

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
    throw new ApiError(httpStatus.NOT_FOUND, "Media post not found");
  }

  return {
    ...mediaPost,
    likesCount: mediaPost._count.likes,
    commentsCount: mediaPost._count.comments,
    sharesCount: mediaPost._count.shares,
    isLiked: currentUserId
      ? mediaPost.likes && mediaPost.likes.length > 0
      : false,
    _count: undefined,
    likes: undefined,
  };
};

const toggleLike = async (mediaPostId: string, userId: string) => {
  const existingLike = await prisma.like.findUnique({
    where: {
      userId_mediaPostId: {
        userId,
        mediaPostId,
      },
    },
  });

  if (existingLike) {
    // Unlike
    await prisma.like.delete({
      where: { id: existingLike.id },
    });

    // Decrement likes count
    await prisma.mediaPost.update({
      where: { id: mediaPostId },
      data: {
        likesCount: { decrement: 1 },
      },
    });

    return { liked: false };
  } else {
    // Like
    await prisma.like.create({
      data: {
        userId,
        mediaPostId,
      },
    });

    // Increment likes count
    await prisma.mediaPost.update({
      where: { id: mediaPostId },
      data: {
        likesCount: { increment: 1 },
      },
    });

    return { liked: true };
  }
};

const addComment = async (
  mediaPostId: string,
  userId: string,
  content: string,
  parentId?: string
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
      "You can only delete your own posts"
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

  return mediaPosts.map((post) => ({
    ...post,
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    sharesCount: post._count.shares,
    isLiked: currentUserId
      ? post.likes && post.likes.length > 0
      : false,
    _count: undefined,
    likes: undefined,
  }));
};
const updateMediaPost = async (
  mediaPostId: string,
  userId: string,
  data: UpdateMediaPostData,
  file?: Express.Multer.File
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
      "You can only edit your own posts"
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
};