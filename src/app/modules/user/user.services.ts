import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import { fileUploader } from "../../helper/fileUploader";
import { Request } from "express";
import { Prisma, Role, UserStatus } from "@prisma/client";
import { IOptions, paginationHelper } from "../../helper/paginationHelper";
import { REGION_MAP, userSearchableFields } from "./user.constant";
import { getRegionDefaultImage } from "../../helper/getRegionDefaultImage";
import config from "../../config";

const registerUser = async (payload: any, req: Request) => {
  const { name, email, password } = payload;

  // Check email exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  let profileImageUrl = null;
  let profileImageFileName = null;

  // Handle file upload
  if (req.file) {
    const uploadResult = await fileUploader.uploadToCloudinary(req.file);

    profileImageUrl = uploadResult.secure_url;
    profileImageFileName = uploadResult.public_id;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      profileImage: profileImageUrl,
      profileImageFileName: profileImageFileName,
    },
  });

  return user;
};

const getAllUsers = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, destination, travelType, ...filterData } = params;
  const andConditions: Prisma.UserWhereInput[] = [];

  // 1. General Search
  if (searchTerm && searchTerm.trim() !== "") {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { bio: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // 2. Smart Destination Logic (Mapping regions to countries)
  if (destination && destination.trim() !== "") {
    const countriesInRegion = REGION_MAP[destination];

    if (countriesInRegion) {
      andConditions.push({
        visitedCountries: {
          hasSome: countriesInRegion,
        },
      });
    } else {
      andConditions.push({
        visitedCountries: {
          has: destination,
        },
      });
    }
  }

  // 3. Optimized Travel Type & Interest Filtering
  if (travelType && travelType.trim() !== "") {
    const tags = travelType.split(",").map((tag: string) => tag.trim());
    
    // Create a search array that includes both Original and Lowercase versions
    const searchTags = [...new Set([...tags, ...tags.map((t: string) => t.toLowerCase())])];
    
    andConditions.push({
      OR: [
        {
          interests: {
            hasSome: searchTags, // Array match (now casing-proof)
          },
        },
        {
          OR: tags.map((tag: string) => ({
            bio: { contains: tag, mode: "insensitive" }, // Text search (always casing-proof)
          })),
        },
      ],
    });
  }

  // 4. Strict Filters
  if (Object.keys(filterData).length > 0) {
    const filters = Object.keys(filterData).map((key) => ({
      [key]: { equals: (filterData as any)[key] },
    }));
    andConditions.push({ AND: filters });
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: {
      [sortBy || "createdAt"]: sortOrder || "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      profileImage: true,
      role: true,
      status: true,
      bio: true,
      interests: true,
      rating: true,
      visitedCountries: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const createAdmin = async (req: Request) => {
  let parsedData;
  
  // Parse the JSON data if it's in the data field
  if (req.body.data) {
    parsedData = JSON.parse(req.body.data);
  } else {
    parsedData = req.body;
  }

  const { password, admin } = parsedData;
  
  if (!admin) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Admin data is required");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: admin.email }
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  let profileImageUrl = null;
  let profileImageFileName = null;

  // Handle file upload
  if (req.file) {
    const uploadResult = await fileUploader.uploadToCloudinary(req.file);
    profileImageUrl = uploadResult?.secure_url;
    profileImageFileName = uploadResult?.public_id;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user with ADMIN role
  const result = await prisma.user.create({
    data: {
      name: admin.name,
      email: admin.email,
      password: hashedPassword,
      role: Role.ADMIN,
      contactNumber: admin.contactNumber,
      profileImage: profileImageUrl,
      profileImageFileName: profileImageFileName,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      contactNumber: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  return result;
};

const getUserProfile = async (id: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { 
      id: id 
    },
    include: {
      travelPlans: {
        where: { visibility: true },
        orderBy: { startDate: 'desc' }
      },
      // Safely include joined trips (buddies)
      joinedTrips: {
        where: { status: 'APPROVED' },
        include: {
            travelPlan: true // Allows showing where they are going
        }
      },
      reviewsReceived: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User profile not found in database");
  }

  // Remove sensitive information
  const { password, ...safeUserData } = user;
  return safeUserData;
};

const updateUserProfile = async (id: string, req: Request) => {
  // Get the user data from request body
  const bodyData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const { status, role, ...otherData } = bodyData;

  // 1. Check if user exists and get their email
  const userToUpdate = await prisma.user.findUnique({
    where: { id },
    select: { email: true }
  });

  if (!userToUpdate) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const isSuperAdmin = userToUpdate.email === config.super_admin.email;
  const currentUser = (req as any).user;
  const isSelfUpdate = currentUser?.email === userToUpdate.email;

  // 2. Handle Cloudinary Upload
  const updateData: any = { ...otherData };

  if (req.file) {
    const upload = await fileUploader.uploadToCloudinary(req.file);
    updateData.profileImage = upload.secure_url;
    updateData.profileImageFileName = upload.public_id;
  }

  // 3. Handle role changes
  if (role && Object.values(Role).includes(role as Role)) {
    if (isSuperAdmin) {
      // Super admin cannot change their own role
      throw new ApiError(httpStatus.FORBIDDEN, "Super admin role cannot be changed");
    }
    
    // Only allow role change if not super admin
    updateData.role = role;
  }

  // 4. Handle status changes
  if (status && Object.values(UserStatus).includes(status as UserStatus)) {
    if (isSuperAdmin && !isSelfUpdate) {
      // Others cannot modify super admin status
      throw new ApiError(httpStatus.FORBIDDEN, "Super admin status cannot be modified");
    }
    
    // Super admin can update their own status (like active/inactive)
    // Others can update status for non-super-admin users
    updateData.status = status;
  }

  // 5. Update Database
  return await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      profileImage: true,
      bio: true,
      contactNumber: true,
      interests: true,
      visitedCountries: true,
      rating: true,
      createdAt: true,
      updatedAt: true,
    }
  });
};

const getTopRatedTravelers = async () => {
  return await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      rating: {
        gt: 0, 
      },
    },
    orderBy: [
      { rating: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 10,
    select: {
      id: true,
      name: true,
      profileImage: true,
      rating: true,
      bio: true,
      _count: {
        select: { travelPlans: true }
      }
    }
  });
};

const getRecentlyActiveUsers = async () => {
  return await prisma.user.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 8,
    select: {
      id: true,
      name: true,
      profileImage: true,
    },
  });
};

const getAdminDashboardStats = async () => {
  const totalUsers = await prisma.user.count();
  const totalTravelPlans = await prisma.travelPlan.count();
  const activeBuddies = await prisma.travelBuddy.count({
    where: { status: 'APPROVED' }
  });
  const bannedUsers = await prisma.user.count({
    where: { status: 'BANNED' }
  });

  return {
    totalUsers,
    totalTravelPlans,
    activeBuddies,
    bannedUsers
  };
};

const getRegionTravelerStats = async () => {
  const stats = await Promise.all(
    Object.keys(REGION_MAP).map(async (regionName) => {
      const countries = REGION_MAP[regionName];
      
      const count = await prisma.user.count({
        where: {
          OR: [
            {
              visitedCountries: {
                hasSome: countries
              }
            },
            {
              visitedCountries: {
                has: regionName
              }
            }
          ]
        }
      });

      return {
        name: regionName,
        count: count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString(),
        image: getRegionDefaultImage(regionName)
      };
    })
  );

  return stats;
};

export const UserService = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createAdmin,
  getTopRatedTravelers,
  getAdminDashboardStats,
  getRecentlyActiveUsers,
  getRegionTravelerStats,
};