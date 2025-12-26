import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import { fileUploader } from "../../helper/fileUploader";
import { Request } from "express";
import { Admin, Prisma, Role } from "@prisma/client";
import { IOptions, paginationHelper } from "../../helper/paginationHelper";
import { REGION_MAP, userSearchableFields } from "./user.constant";
import { getRegionDefaultImage } from "../../helper/getRegionDefaultImage";

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
  // This now checks BOTH the specific interests array AND the bio string
  if (travelType && travelType.trim() !== "") {
  const tags = travelType.split(",").map((tag: string) => tag.trim());
  
  // Create a search array that includes both Original and Lowercase versions
  // This solves the case-sensitivity issue in Prisma's hasSome
  const searchTags = [...new Set([...tags, ...tags.map(t => t.toLowerCase())])];
  
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
      interests: true, // Included in selection
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

const createAdmin = async (req: Request): Promise<Admin> => {
  const file = req.file;

  if (file) {
    const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
    req.body.admin.profilePhoto = uploadToCloudinary?.secure_url;
  }

  const hashedPassword: string = await bcrypt.hash(req.body.password, 10);

  const userData = {
    name: req.body.admin.name,
    email: req.body.admin.email,
    password: hashedPassword,
    role: Role.ADMIN,
  };

  const result = await prisma.$transaction(async (transactionClient) => {
    await transactionClient.user.create({
      data: userData,
    });

    const createdAdminData = await transactionClient.admin.create({
      data: req.body.admin,
    });

    return createdAdminData;
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
    // This is the error triggering "Profile Not Found" on frontend
    throw new ApiError(httpStatus.NOT_FOUND, "User profile not found in database");
  }

  // Remove sensitive information
  const { password, ...safeUserData } = user;
  return safeUserData;
};

const updateUserProfile = async (id: string, req: Request) => {
  // 1. Parse the text data from the 'data' field sent by frontend
  const bodyData = req.body.data ? JSON.parse(req.body.data) : req.body;

  const updateData: any = { ...bodyData };

  // 2. Handle Cloudinary Upload
  if (req.file) {
    const upload = await fileUploader.uploadToCloudinary(req.file);
    updateData.profileImage = upload.secure_url;
    updateData.profileImageFileName = upload.public_id;
  }

  // 3. Update Database
  return prisma.user.update({
    where: { id },
    data: updateData,
  });
};

const getTopRatedTravelers = async () => {
  return await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      // ✅ This ensures only users who have been rated are shown
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
      updatedAt: 'desc', // This tracks recent activity
    },
    take: 8, // Limit for the avatar stack
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
              // Check if any country in the REGION_MAP exists in user's visited list
              visitedCountries: {
                hasSome: countries
              }
            },
            {
              // Fallback: If the user literally typed the region name (e.g. "Asia")
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
