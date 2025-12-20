import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import { fileUploader } from "../../helper/fileUploader";
import { Request } from "express";
import { Admin, Prisma, Role } from "@prisma/client";
import { IOptions, paginationHelper } from "../../helper/paginationHelper";
import { userSearchableFields } from "./user.constant";

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
    
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.UserWhereInput[] = [];

  // ✅ Fix: Only add search conditions if searchTerm actually has a value
  if (searchTerm && searchTerm.trim() !== "") {
    andConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // ✅ Fix: Ensure filter keys actually exist and have values
  if (Object.keys(filterData).length > 0) {
    const filters = Object.keys(filterData).map((key) => ({
      [key]: {
        equals: (filterData as any)[key],
      },
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
      // ✅ Fix: Default to 'createdAt' if sortBy is missing
      [sortBy || "createdAt"]: sortOrder || "desc",
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

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
  const user = await prisma.user.findUnique({
    where: { id },
     include: {
      travelPlans: true,
      reviewsGiven: true,
      reviewsReceived: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
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
      // rating: { gt: 0 } <--- Remove or comment this out to see users before they have reviews
    },
    orderBy: [
      { rating: 'desc' },
      { createdAt: 'desc' } // Secondary sort so new users show up if ratings are all 0
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
export const UserService = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createAdmin,
  getTopRatedTravelers,
  getAdminDashboardStats,
};
