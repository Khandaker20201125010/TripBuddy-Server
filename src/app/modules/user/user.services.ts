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

  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0
      ? {
          AND: andConditions,
        }
      : {};

  const result = await prisma.user.findMany({
    skip,
    take: limit,

    where: whereConditions,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });
  return {
    meta: {
      page,
      limit,
      total,
    },
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
      reviewsReceived: true,
      reviewsGiven: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUserProfile = async (id: string, payload: any) => {
  return prisma.user.update({
    where: { id },
    data: payload,
  });
};

export const UserService = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createAdmin,
};
