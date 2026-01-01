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
exports.TravelPlanService = void 0;
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const paginationHelper_1 = require("../../helper/paginationHelper");
const fileUploader_1 = require("../../helper/fileUploader");
const Open_Router_1 = require("../../helper/Open-Router");
const getPlanStatus_1 = require("../../helper/getPlanStatus");
const PLAN_LIMITS = {
    FREE: 2,
    EXPLORER: 5,
    UNLIMITED: Infinity,
};
const createTravelPlan = (payload, userId, file) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Check User Subscription and Limits
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionType: true, subscriptionExpiresAt: true, role: true },
    });
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Admin bypasses all limits
    if (user.role !== "ADMIN") {
        const currentPlanCount = yield prisma_1.prisma.travelPlan.count({
            where: { userId },
        });
        const isSubscribed = user.subscriptionExpiresAt &&
            new Date(user.subscriptionExpiresAt) > new Date();
        const subType = isSubscribed ? user.subscriptionType : null;
        let limit = PLAN_LIMITS.FREE;
        if (subType === "MONTHLY" || subType === "YEARLY") {
            limit = PLAN_LIMITS.UNLIMITED;
        }
        else if (subType === "EXPLORER") {
            limit = PLAN_LIMITS.EXPLORER;
        }
        if (currentPlanCount >= limit) {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, `You have reached the limit of ${limit} plans for your current subscription. Please upgrade to create more.`);
        }
    }
    // 2. Proceed with Creation
    let imageUrl = null;
    if (file) {
        const cloudResult = yield fileUploader_1.fileUploader.uploadToCloudinary(file);
        imageUrl = cloudResult.secure_url;
    }
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid date format provided for startDate or endDate");
    }
    return yield prisma_1.prisma.travelPlan.create({
        data: {
            destination: payload.destination,
            travelType: payload.travelType,
            description: payload.description,
            image: imageUrl,
            userId,
            budget: Number(payload.budget),
            startDate: start,
            endDate: end,
            visibility: payload.visibility === true || payload.visibility === "true",
        },
        include: {
            user: true,
        },
    });
});
const getAllTravelPlans = (params, options, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm, destination, minBudget, maxBudget, startDate, endDate, travelType } = params, filterData = __rest(params, ["searchTerm", "destination", "minBudget", "maxBudget", "startDate", "endDate", "travelType"]);
    const andConditions = [];
    // 1. Search Logic (Global Search)
    if (searchTerm && searchTerm.trim() !== "") {
        andConditions.push({
            OR: [
                { destination: { contains: searchTerm, mode: "insensitive" } },
                { description: { contains: searchTerm, mode: "insensitive" } },
                {
                    user: {
                        OR: [
                            { name: { contains: searchTerm, mode: "insensitive" } },
                            { email: { contains: searchTerm, mode: "insensitive" } },
                            { bio: { contains: searchTerm, mode: "insensitive" } },
                        ],
                    },
                },
            ],
        });
    }
    // 2. Destination Logic
    if (destination && destination.trim() !== "") {
        andConditions.push({
            destination: {
                contains: destination,
                mode: "insensitive",
            },
        });
    }
    // 3. Travel Type Logic
    if (travelType && travelType.trim() !== "") {
        const tags = travelType.split(",").map((tag) => tag.trim());
        const searchTags = [
            ...new Set([...tags, ...tags.map((t) => t.toLowerCase())]),
        ];
        andConditions.push({
            OR: [
                { travelType: { in: searchTags } },
                {
                    user: {
                        interests: {
                            hasSome: searchTags,
                        },
                    },
                },
            ],
        });
    }
    // 4. Budget Filter
    if (minBudget || maxBudget) {
        andConditions.push({
            budget: {
                gte: minBudget ? Number(minBudget) : undefined,
                lte: maxBudget ? Number(maxBudget) : undefined,
            },
        });
    }
    // 5. Date Filter
    if (startDate || endDate) {
        andConditions.push({
            startDate: {
                gte: startDate ? new Date(startDate) : undefined,
            },
            endDate: {
                lte: endDate ? new Date(endDate) : undefined,
            },
        });
    }
    // 6. Strict Filters
    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: {
                    equals: filterData[key],
                },
            })),
        });
    }
    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};
    // 1. Fetch travel plans
    const plans = yield prisma_1.prisma.travelPlan.findMany({
        skip,
        take: limit,
        where: whereConditions,
        distinct: ["userId"],
        orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImage: true,
                    bio: true,
                    interests: true,
                    rating: true,
                    status: true,
                    role: true,
                    visitedCountries: true,
                    // --- FIXED: ADDED THESE FIELDS ---
                    premium: true,
                    subscriptionType: true,
                    // --------------------------------
                },
            },
        },
    });
    // 2. Get all user IDs from the plans
    const userIds = plans.map((plan) => { var _a; return (_a = plan.user) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean);
    // 3. Fetch connections between current user and these users
    let connections = [];
    if (currentUserId && userIds.length > 0) {
        connections = yield prisma_1.prisma.connection.findMany({
            where: {
                OR: [
                    {
                        senderId: currentUserId,
                        receiverId: { in: userIds },
                    },
                    {
                        senderId: { in: userIds },
                        receiverId: currentUserId,
                    },
                ],
            },
            select: {
                id: true,
                senderId: true,
                receiverId: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    // 4. Map connections to users
    const userConnectionsMap = {};
    connections.forEach((conn) => {
        if (conn.senderId === currentUserId) {
            userConnectionsMap[conn.receiverId] = {
                id: conn.id,
                status: conn.status,
                direction: "sent",
            };
        }
        else if (conn.receiverId === currentUserId) {
            userConnectionsMap[conn.senderId] = {
                id: conn.id,
                status: conn.status,
                direction: "received",
            };
        }
    });
    // 5. Enhance plans with connection info
    const enhancedPlans = plans.map((plan) => {
        const user = plan.user;
        const connectionInfo = (user === null || user === void 0 ? void 0 : user.id) ? userConnectionsMap[user.id] : null;
        return Object.assign(Object.assign({}, plan), { user: user
                ? Object.assign(Object.assign({}, user), { connectionInfo }) : null });
    });
    // 6. Calculate total count
    const groupedCount = yield prisma_1.prisma.travelPlan.groupBy({
        by: ["userId"],
        where: whereConditions,
    });
    const total = groupedCount.length;
    return {
        meta: { page, limit, total },
        data: enhancedPlans,
    };
});
const getSingleTravelPlan = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const plan = yield prisma_1.prisma.travelPlan.findUnique({
        where: { id },
        include: {
            user: true, // The Host details
            buddies: true, // REQUIRED: To check if current user is APPROVED
            reviews: {
                // REQUIRED: To display existing reviews
                include: {
                    reviewer: true, // To show name/image of reviewer
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    if (!plan)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Travel Plan not found");
    return plan;
});
const updateTravelPlan = (id, userId, payload, userRole, file) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma_1.prisma.travelPlan.findUnique({ where: { id } });
    if (!existing)
        throw new ApiError_1.default(404, "Travel Plan not found");
    if (existing.userId !== userId && userRole !== "ADMIN") {
        throw new ApiError_1.default(403, "Unauthorized to update");
    }
    let imageUrl = existing.image;
    if (file) {
        const cloudResult = yield fileUploader_1.fileUploader.uploadToCloudinary(file);
        imageUrl = cloudResult.secure_url;
    }
    const updatedData = {};
    if (payload.destination !== undefined)
        updatedData.destination = payload.destination;
    if (payload.travelType !== undefined)
        updatedData.travelType = payload.travelType;
    if (payload.description !== undefined)
        updatedData.description = payload.description;
    if (payload.visibility !== undefined)
        updatedData.visibility =
            payload.visibility === true || payload.visibility === "true";
    if (payload.budget !== undefined)
        updatedData.budget = Number(payload.budget);
    if (payload.startDate)
        updatedData.startDate = new Date(payload.startDate);
    if (payload.endDate)
        updatedData.endDate = new Date(payload.endDate);
    updatedData.image = imageUrl;
    return prisma_1.prisma.travelPlan.update({
        where: { id },
        data: updatedData,
        include: { user: true },
    });
});
const deleteTravelPlan = (id, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma_1.prisma.travelPlan.findUnique({ where: { id } });
    if (!existing)
        throw new ApiError_1.default(404, "Travel Plan not found");
    // Allow if user is the OWNER OR user is an ADMIN
    const isOwner = existing.userId === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isOwner && !isAdmin) {
        throw new ApiError_1.default(403, "Unauthorized to delete this plan");
    }
    return yield prisma_1.prisma.travelPlan.delete({
        where: { id },
    });
});
const getCommunityStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31`);
    // A. Count Unique Travelers (Unique UserIds in TravelPlans)
    const uniqueTravelers = yield prisma_1.prisma.travelPlan.groupBy({
        by: ["userId"],
    });
    // B. Count Unique Destinations
    const uniqueDestinations = yield prisma_1.prisma.travelPlan.groupBy({
        by: ["destination"],
    });
    // C. Count Trips in Current Year
    const currentYearTrips = yield prisma_1.prisma.travelPlan.count({
        where: {
            startDate: {
                gte: startOfYear,
                lte: endOfYear,
            },
        },
    });
    // D. Get Trending Destinations (Group by destination, count desc, top 5)
    const trendingGroups = yield prisma_1.prisma.travelPlan.groupBy({
        by: ["destination"],
        _count: {
            destination: true,
        },
        orderBy: {
            _count: {
                destination: "desc",
            },
        },
        take: 5,
    });
    // Format trending data for frontend
    const trending = trendingGroups.map((group) => ({
        destination: group.destination,
        count: group._count.destination,
    }));
    return {
        travelers: uniqueTravelers.length,
        destinations: uniqueDestinations.length,
        tripsThisYear: currentYearTrips,
        trending,
    };
});
const matchTravelPlans = (filters, options, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const { destination, startDate, endDate, travelType, searchTerm } = filters;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;
    const andConditions = [];
    // 1. Exclude current user's own trips
    if (currentUserId) {
        andConditions.push({ userId: { not: currentUserId } });
    }
    // 2. Default: Show only FUTURE trips if no specific dates are requested
    if (!startDate && !endDate) {
        andConditions.push({ endDate: { gte: new Date() } });
    }
    // 3. Search Term (General Search)
    if (searchTerm) {
        andConditions.push({
            OR: [
                { destination: { contains: searchTerm, mode: "insensitive" } },
                { travelType: { contains: searchTerm, mode: "insensitive" } },
            ],
        });
    }
    // 4. Destination Filter
    if (destination) {
        andConditions.push({
            destination: { contains: destination, mode: "insensitive" },
        });
    }
    // 5. Vibe/Travel Type Filter
    // Using insensitive ensures "adventure" matches "Adventure"
    if (travelType) {
        andConditions.push({
            travelType: { equals: travelType, mode: "insensitive" }
        });
    }
    // 6. Date Filters
    if (startDate) {
        andConditions.push({ startDate: { gte: new Date(startDate) } });
    }
    if (endDate) {
        andConditions.push({ endDate: { lte: new Date(endDate) } });
    }
    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};
    // --- SORTING LOGIC FIXED ---
    // We initialize with a safe default
    let orderBy = {
        createdAt: "desc", // Default: Newest first
    };
    // Strictly check the string values
    if (options.sortBy === "Date") {
        orderBy = { startDate: "asc" }; // Soonest trips first
    }
    else if (options.sortBy === "Destination") {
        orderBy = { destination: "asc" }; // A-Z
    }
    // If "Best Match" or unknown string, it stays as createdAt: "desc"
    const [data, total] = yield Promise.all([
        prisma_1.prisma.travelPlan.findMany({
            where: whereConditions,
            include: { user: true, buddies: true },
            skip,
            take: limit,
            orderBy: orderBy,
        }),
        prisma_1.prisma.travelPlan.count({ where: whereConditions }),
    ]);
    return {
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        data,
    };
});
const getRecommendedTravelers = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Fetch current user safely
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { interests: true, visitedCountries: true },
        });
        // 2. Determine search criteria
        const searchCriteria = (user === null || user === void 0 ? void 0 : user.interests) && user.interests.length > 0
            ? user.interests
            : (user === null || user === void 0 ? void 0 : user.visitedCountries) || [];
        let recommended = [];
        // 3. Smart Match (Only if criteria exists)
        if (searchCriteria.length > 0) {
            try {
                recommended = yield prisma_1.prisma.user.findMany({
                    where: {
                        id: { not: userId }, // Don't recommend myself
                        status: "ACTIVE",
                        OR: [
                            { interests: { hasSome: searchCriteria } },
                            { visitedCountries: { hasSome: searchCriteria } },
                        ],
                    },
                    take: 3,
                    orderBy: { rating: "desc" },
                });
            }
            catch (innerError) {
                console.warn("Smart match query failed (likely DB mismatch), falling back.");
            }
        }
        // 4. Fallback: If no smart matches, just get Top Rated Active Users
        if (recommended.length === 0) {
            recommended = yield prisma_1.prisma.user.findMany({
                where: {
                    id: { not: userId },
                    status: "ACTIVE",
                },
                take: 3,
                orderBy: { rating: "desc" },
            });
        }
        return recommended;
    }
    catch (error) {
        console.error("Critical Service Error:", error);
        return []; // Return empty array so frontend doesn't break
    }
});
const getAISuggestions = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { symptoms } = payload;
    if (!symptoms) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "symptoms is required!");
    }
    const travelPlans = yield prisma_1.prisma.travelPlan.findMany({
        include: {
            user: true,
            reviews: true,
        },
    });
    const simplifiedPlans = travelPlans.map((plan) => ({
        id: plan.id,
        destination: plan.destination,
        travelType: plan.travelType,
        budget: plan.budget,
        description: plan.description,
        startDate: plan.startDate,
        endDate: plan.endDate,
        owner: {
            name: plan.user.name,
        },
        reviews: plan.reviews.length,
    }));
    const prompt = `
You are a travel recommendation AI.
User symptoms: "${symptoms}"
Here is a list of available travel plans:
${JSON.stringify(simplifiedPlans, null, 2)}
TASK:
Select the TOP 3 travel plans that best match the user's symptoms.
RULES:
- ALWAYS return between 1 to 3 suggestions.
- Sort them by relevance (highest matchScore first).
- Return ONLY VALID JSON.
- Do NOT include any explanation outside JSON.
The JSON format MUST be:
{
  "suggestions": [
    {
      "id": "...",
      "matchScore": number,
      "reason": "short reason"
    }
  ]
}
`;
    const response = yield Open_Router_1.openai.chat.completions.create({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
    });
    const aiText = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
    let aiOutput;
    try {
        aiOutput = JSON.parse(aiText);
    }
    catch (_c) {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                aiOutput = JSON.parse(match[0]);
            }
            catch (_d) {
                throw new ApiError_1.default(500, "AI returned invalid JSON (after extraction)");
            }
        }
        else {
            throw new ApiError_1.default(500, "AI returned invalid JSON format");
        }
    }
    return {
        ai: aiOutput,
        availablePlans: travelPlans,
    };
});
const getMyTravelPlans = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[Service] Getting travel plans for user: ${userId}`);
    const plans = yield prisma_1.prisma.travelPlan.findMany({
        where: { userId },
        orderBy: { startDate: "asc" },
        include: {
            user: true,
            buddies: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profileImage: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
    console.log(`[Service] Found ${plans.length} plans`);
    const result = plans.map((plan) => (Object.assign(Object.assign({}, plan), { status: (0, getPlanStatus_1.getPlanStatus)(plan.startDate, plan.endDate) })));
    // Debug: Check if buddies are included
    result.forEach((plan) => {
        var _a;
        console.log(`Plan ${plan.destination}: ${((_a = plan.buddies) === null || _a === void 0 ? void 0 : _a.length) || 0} buddies`);
    });
    return result;
});
const requestJoinTrip = (travelPlanId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const plan = yield prisma_1.prisma.travelPlan.findUnique({
        where: { id: travelPlanId },
    });
    if (!plan)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Plan not found");
    if (plan.userId === userId)
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "You cannot join your own trip");
    // Check if request already exists
    const existing = yield prisma_1.prisma.travelBuddy.findUnique({
        where: { travelPlanId_userId: { travelPlanId, userId } },
    });
    if (existing)
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Request already sent or processed");
    // Create the Buddy entry
    const result = yield prisma_1.prisma.travelBuddy.create({
        data: {
            travelPlanId,
            userId,
            status: "PENDING",
        },
    });
    // Create Notification for Host
    yield prisma_1.prisma.notification.create({
        data: {
            userId: plan.userId,
            message: "Someone requested to join your trip!",
            type: "TRIP_JOIN_REQUEST",
            travelPlanId: travelPlanId, // Added to match your schema
            link: `/trips/${travelPlanId}`,
            isRead: false,
        },
    });
    return result;
});
const updateJoinRequestStatus = (buddyId, hostId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const buddyRecord = yield prisma_1.prisma.travelBuddy.findUnique({
        where: { id: buddyId },
        include: { travelPlan: true },
    });
    if (!buddyRecord)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Request not found");
    if (buddyRecord.travelPlan.userId !== hostId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You are not the host of this trip");
    }
    const result = yield prisma_1.prisma.travelBuddy.update({
        where: { id: buddyId },
        data: { status },
    });
    // ✅ FIX: Only send notification if it's APPROVED (matching your Enum)
    // Or handle REJECTED using a different message but same Enum if needed.
    if (status === "APPROVED") {
        yield prisma_1.prisma.notification.create({
            data: {
                userId: buddyRecord.userId,
                message: `Your request for ${buddyRecord.travelPlan.destination} was approved!`,
                type: "TRIP_APPROVED", // This matches your Enum exactly
                travelPlanId: buddyRecord.travelPlanId,
                link: `/trips/${buddyRecord.travelPlanId}`,
            },
        });
    }
    return result;
});
const getMyTripRequests = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Get all pending join requests for user's plans
    const requests = yield prisma_1.prisma.travelBuddy.findMany({
        where: {
            travelPlan: {
                userId: userId, // Only plans where user is the host
            },
            status: "PENDING", // Only pending requests
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                    email: true,
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
        orderBy: { createdAt: "desc" },
    });
    // Transform to match your TripRequest interface
    return requests.map((request) => {
        var _a;
        return ({
            id: request.id, // This is the buddyId
            status: request.status,
            user: request.user,
            travelPlan: {
                id: request.travelPlan.id,
                destination: request.travelPlan.destination,
                startDate: request.travelPlan.startDate.toISOString(),
                endDate: (_a = request.travelPlan.endDate) === null || _a === void 0 ? void 0 : _a.toISOString(),
            },
            createdAt: request.createdAt.toISOString(),
        });
    });
});
// Update getMyTravelPlans to include buddies (needed for the UI)
const getMyTravelPlansWithBuddies = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.travelPlan.findMany({
        where: { userId },
        include: {
            buddies: {
                where: { status: "PENDING" }, // Only show pending requests in ManageRequests
                include: { user: true },
            },
            user: true,
        },
        orderBy: { createdAt: "desc" },
    });
});
exports.TravelPlanService = {
    createTravelPlan,
    getAllTravelPlans,
    getSingleTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
    getCommunityStats,
    matchTravelPlans,
    getAISuggestions,
    getRecommendedTravelers,
    getMyTravelPlans,
    requestJoinTrip,
    updateJoinRequestStatus,
    getMyTravelPlansWithBuddies,
    getMyTripRequests,
};
