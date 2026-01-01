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
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const fileUploader_1 = require("../../helper/fileUploader");
const client_1 = require("@prisma/client");
const paginationHelper_1 = require("../../helper/paginationHelper");
const user_constant_1 = require("./user.constant");
const getRegionDefaultImage_1 = require("../../helper/getRegionDefaultImage");
const config_1 = __importDefault(require("../../config"));
const registerUser = (payload, req) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = payload;
    // Check email exists
    const existing = yield prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Email already exists");
    }
    let profileImageUrl = null;
    let profileImageFileName = null;
    // Handle file upload
    if (req.file) {
        const uploadResult = yield fileUploader_1.fileUploader.uploadToCloudinary(req.file);
        profileImageUrl = uploadResult.secure_url;
        profileImageFileName = uploadResult.public_id;
    }
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    const user = yield prisma_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            profileImage: profileImageUrl,
            profileImageFileName: profileImageFileName,
        },
    });
    return user;
});
const getAllUsers = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm, destination, travelType } = params, filterData = __rest(params, ["searchTerm", "destination", "travelType"]);
    const andConditions = [];
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
        const countriesInRegion = user_constant_1.REGION_MAP[destination];
        if (countriesInRegion) {
            andConditions.push({
                visitedCountries: {
                    hasSome: countriesInRegion,
                },
            });
        }
        else {
            andConditions.push({
                visitedCountries: {
                    has: destination,
                },
            });
        }
    }
    // 3. Optimized Travel Type & Interest Filtering
    if (travelType && travelType.trim() !== "") {
        const tags = travelType.split(",").map((tag) => tag.trim());
        // Create a search array that includes both Original and Lowercase versions
        const searchTags = [...new Set([...tags, ...tags.map((t) => t.toLowerCase())])];
        andConditions.push({
            OR: [
                {
                    interests: {
                        hasSome: searchTags, // Array match (now casing-proof)
                    },
                },
                {
                    OR: tags.map((tag) => ({
                        bio: { contains: tag, mode: "insensitive" }, // Text search (always casing-proof)
                    })),
                },
            ],
        });
    }
    // 4. Strict Filters
    if (Object.keys(filterData).length > 0) {
        const filters = Object.keys(filterData).map((key) => ({
            [key]: { equals: filterData[key] },
        }));
        andConditions.push({ AND: filters });
    }
    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};
    const result = yield prisma_1.prisma.user.findMany({
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
    const total = yield prisma_1.prisma.user.count({ where: whereConditions });
    return {
        meta: { page, limit, total },
        data: result,
    };
});
const createAdmin = (req) => __awaiter(void 0, void 0, void 0, function* () {
    let parsedData;
    // Parse the JSON data if it's in the data field
    if (req.body.data) {
        parsedData = JSON.parse(req.body.data);
    }
    else {
        parsedData = req.body;
    }
    const { password, admin } = parsedData;
    if (!admin) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Admin data is required");
    }
    // Check if user already exists
    const existingUser = yield prisma_1.prisma.user.findUnique({
        where: { email: admin.email }
    });
    if (existingUser) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Email already exists");
    }
    let profileImageUrl = null;
    let profileImageFileName = null;
    // Handle file upload
    if (req.file) {
        const uploadResult = yield fileUploader_1.fileUploader.uploadToCloudinary(req.file);
        profileImageUrl = uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.secure_url;
        profileImageFileName = uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.public_id;
    }
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    // Create user with ADMIN role
    const result = yield prisma_1.prisma.user.create({
        data: {
            name: admin.name,
            email: admin.email,
            password: hashedPassword,
            role: client_1.Role.ADMIN,
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
});
const getUserProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if user exists
    const user = yield prisma_1.prisma.user.findUnique({
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
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User profile not found in database");
    }
    // Remove sensitive information
    const { password } = user, safeUserData = __rest(user, ["password"]);
    return safeUserData;
});
const updateUserProfile = (id, req) => __awaiter(void 0, void 0, void 0, function* () {
    // Get the user data from request body
    const bodyData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const { status, role } = bodyData, otherData = __rest(bodyData, ["status", "role"]);
    // 1. Check if user exists and get their email
    const userToUpdate = yield prisma_1.prisma.user.findUnique({
        where: { id },
        select: { email: true }
    });
    if (!userToUpdate) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    const isSuperAdmin = userToUpdate.email === config_1.default.super_admin.email;
    const currentUser = req.user;
    const isSelfUpdate = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.email) === userToUpdate.email;
    // 2. Handle Cloudinary Upload
    const updateData = Object.assign({}, otherData);
    if (req.file) {
        const upload = yield fileUploader_1.fileUploader.uploadToCloudinary(req.file);
        updateData.profileImage = upload.secure_url;
        updateData.profileImageFileName = upload.public_id;
    }
    // 3. Handle role changes
    if (role && Object.values(client_1.Role).includes(role)) {
        if (isSuperAdmin) {
            // Super admin cannot change their own role
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Super admin role cannot be changed");
        }
        // Only allow role change if not super admin
        updateData.role = role;
    }
    // 4. Handle status changes
    if (status && Object.values(client_1.UserStatus).includes(status)) {
        if (isSuperAdmin && !isSelfUpdate) {
            // Others cannot modify super admin status
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Super admin status cannot be modified");
        }
        // Super admin can update their own status (like active/inactive)
        // Others can update status for non-super-admin users
        updateData.status = status;
    }
    // 5. Update Database
    return yield prisma_1.prisma.user.update({
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
});
const getTopRatedTravelers = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.user.findMany({
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
});
const getRecentlyActiveUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.user.findMany({
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
});
const getAdminDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const totalUsers = yield prisma_1.prisma.user.count();
    const totalTravelPlans = yield prisma_1.prisma.travelPlan.count();
    const activeBuddies = yield prisma_1.prisma.travelBuddy.count({
        where: { status: 'APPROVED' }
    });
    const bannedUsers = yield prisma_1.prisma.user.count({
        where: { status: 'BANNED' }
    });
    return {
        totalUsers,
        totalTravelPlans,
        activeBuddies,
        bannedUsers
    };
});
const getRegionTravelerStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const stats = yield Promise.all(Object.keys(user_constant_1.REGION_MAP).map((regionName) => __awaiter(void 0, void 0, void 0, function* () {
        const countries = user_constant_1.REGION_MAP[regionName];
        const count = yield prisma_1.prisma.user.count({
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
            image: (0, getRegionDefaultImage_1.getRegionDefaultImage)(regionName)
        };
    })));
    return stats;
});
exports.UserService = {
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
