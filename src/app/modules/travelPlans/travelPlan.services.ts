import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { Prisma, User } from "@prisma/client";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";
import { travelPlanSearchableFields } from "./travelPlan.constant";
import { fileUploader } from "../../helper/fileUploader";
import { openai } from "../../helper/Open-Router";
import { getPlanStatus } from "../../helper/getPlanStatus";

const PLAN_LIMITS = {
  FREE: 2,
  EXPLORER: 5,
  UNLIMITED: Infinity,
};
const createTravelPlan = async (
  payload: any,
  userId: string,
  file?: Express.Multer.File
) => {
  // 1. Check User Subscription and Limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionType: true, subscriptionExpiresAt: true, role: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Admin bypasses all limits
  if (user.role !== "ADMIN") {
    const currentPlanCount = await prisma.travelPlan.count({
      where: { userId },
    });

    const isSubscribed =
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) > new Date();
    const subType = isSubscribed ? user.subscriptionType : null;

    let limit = PLAN_LIMITS.FREE;

    if (subType === "MONTHLY" || subType === "YEARLY") {
      limit = PLAN_LIMITS.UNLIMITED;
    } else if (subType === "EXPLORER") {
      limit = PLAN_LIMITS.EXPLORER;
    }

    if (currentPlanCount >= limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `You have reached the limit of ${limit} plans for your current subscription. Please upgrade to create more.`
      );
    }
  }

  // 2. Proceed with Creation
  let imageUrl = null;

  if (file) {
    const cloudResult = await fileUploader.uploadToCloudinary(file);
    imageUrl = cloudResult.secure_url;
  }

  const start = new Date(payload.startDate);
  const end = new Date(payload.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid date format provided for startDate or endDate"
    );
  }

  return await prisma.travelPlan.create({
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
};

const getAllTravelPlans = async (
  params: any,
  options: IOptions,
  currentUserId?: string
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const {
    searchTerm,
    destination,
    minBudget,
    maxBudget,
    startDate,
    endDate,
    travelType,
    ...filterData
  } = params;
  const andConditions: Prisma.TravelPlanWhereInput[] = [];

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
    const tags = travelType.split(",").map((tag: string) => tag.trim());
    const searchTags = [
      ...new Set([...tags, ...tags.map((t: string) => t.toLowerCase())]),
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

  const whereConditions: Prisma.TravelPlanWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // 1. Fetch travel plans
  const plans = await prisma.travelPlan.findMany({
    skip,
    take: limit,
    where: whereConditions,
    distinct: ["userId"],
    orderBy:
      sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: "desc" },
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
  const userIds = plans.map((plan) => plan.user?.id).filter(Boolean);

  // 3. Fetch connections between current user and these users
  let connections: any[] = [];
  if (currentUserId && userIds.length > 0) {
    connections = await prisma.connection.findMany({
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
  const userConnectionsMap: Record<string, any> = {};
  connections.forEach((conn) => {
    if (conn.senderId === currentUserId) {
      userConnectionsMap[conn.receiverId] = {
        id: conn.id,
        status: conn.status,
        direction: "sent",
      };
    } else if (conn.receiverId === currentUserId) {
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
    const connectionInfo = user?.id ? userConnectionsMap[user.id] : null;

    return {
      ...plan,
      user: user
        ? {
            ...user,
            connectionInfo,
          }
        : null,
    };
  });

  // 6. Calculate total count
  const groupedCount = await prisma.travelPlan.groupBy({
    by: ["userId"],
    where: whereConditions,
  });
  const total = groupedCount.length;

  return {
    meta: { page, limit, total },
    data: enhancedPlans,
  };
};

const getSingleTravelPlan = async (id: string) => {
  const plan = await prisma.travelPlan.findUnique({
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

  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, "Travel Plan not found");
  return plan;
};
const updateTravelPlan = async (
  id: string,
  userId: string,
  payload: any,
  userRole: string,
  file?: Express.Multer.File
) => {
  const existing = await prisma.travelPlan.findUnique({ where: { id } });

  if (!existing) throw new ApiError(404, "Travel Plan not found");
  if (existing.userId !== userId && userRole !== "ADMIN") {
    throw new ApiError(403, "Unauthorized to update");
  }

  let imageUrl = existing.image;

  if (file) {
    const cloudResult = await fileUploader.uploadToCloudinary(file);
    imageUrl = cloudResult.secure_url;
  }

  const updatedData: any = {};

  if (payload.destination !== undefined)
    updatedData.destination = payload.destination;
  if (payload.travelType !== undefined)
    updatedData.travelType = payload.travelType;
  if (payload.description !== undefined)
    updatedData.description = payload.description;
  if (payload.visibility !== undefined)
    updatedData.visibility =
      payload.visibility === true || payload.visibility === "true";
  if (payload.budget !== undefined) updatedData.budget = Number(payload.budget);
  if (payload.startDate) updatedData.startDate = new Date(payload.startDate);
  if (payload.endDate) updatedData.endDate = new Date(payload.endDate);

  updatedData.image = imageUrl;

  return prisma.travelPlan.update({
    where: { id },
    data: updatedData,
    include: { user: true },
  });
};

const deleteTravelPlan = async (
  id: string,
  userId: string,
  userRole: string
) => {
  const existing = await prisma.travelPlan.findUnique({ where: { id } });

  if (!existing) throw new ApiError(404, "Travel Plan not found");

  // Allow if user is the OWNER OR user is an ADMIN
  const isOwner = existing.userId === userId;
  const isAdmin = userRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Unauthorized to delete this plan");
  }

  return await prisma.travelPlan.delete({
    where: { id },
  });
};

const getCommunityStats = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  const endOfYear = new Date(`${currentYear}-12-31`);

  // A. Count Unique Travelers (Unique UserIds in TravelPlans)
  const uniqueTravelers = await prisma.travelPlan.groupBy({
    by: ["userId"],
  });

  // B. Count Unique Destinations
  const uniqueDestinations = await prisma.travelPlan.groupBy({
    by: ["destination"],
  });

  // C. Count Trips in Current Year
  const currentYearTrips = await prisma.travelPlan.count({
    where: {
      startDate: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
  });

  // D. Get Trending Destinations (Group by destination, count desc, top 5)
  const trendingGroups = await prisma.travelPlan.groupBy({
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
};
const matchTravelPlans = async (
  filters: any,
  options: { page?: number; limit?: number; sortBy?: string },
  currentUserId?: string
) => {
  const { destination, startDate, endDate, travelType, searchTerm } = filters;

  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const skip = (page - 1) * limit;

  const andConditions: Prisma.TravelPlanWhereInput[] = [];

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

  const whereConditions: Prisma.TravelPlanWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // --- SORTING LOGIC FIXED ---
  // We initialize with a safe default
  let orderBy: Prisma.TravelPlanOrderByWithRelationInput = {
    createdAt: "desc", // Default: Newest first
  };

  // Strictly check the string values
  if (options.sortBy === "Date") {
    orderBy = { startDate: "asc" }; // Soonest trips first
  } else if (options.sortBy === "Destination") {
    orderBy = { destination: "asc" }; // A-Z
  }
  // If "Best Match" or unknown string, it stays as createdAt: "desc"

  const [data, total] = await Promise.all([
    prisma.travelPlan.findMany({
      where: whereConditions,
      include: { user: true, buddies: true },
      skip,
      take: limit,
      orderBy: orderBy,
    }),
    prisma.travelPlan.count({ where: whereConditions }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};
const getRecommendedTravelers = async (userId: string): Promise<User[]> => {
  try {
    // 1. Fetch current user safely
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { interests: true, visitedCountries: true },
    });

    // 2. Determine search criteria
    const searchCriteria =
      user?.interests && user.interests.length > 0
        ? user.interests
        : user?.visitedCountries || [];

    let recommended: User[] = [];

    // 3. Smart Match (Only if criteria exists)
    if (searchCriteria.length > 0) {
      try {
        recommended = await prisma.user.findMany({
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
      } catch (innerError) {
        console.warn(
          "Smart match query failed (likely DB mismatch), falling back."
        );
      }
    }

    // 4. Fallback: If no smart matches, just get Top Rated Active Users
    if (recommended.length === 0) {
      recommended = await prisma.user.findMany({
        where: {
          id: { not: userId },
          status: "ACTIVE",
        },
        take: 3,
        orderBy: { rating: "desc" },
      });
    }

    return recommended;
  } catch (error) {
    console.error("Critical Service Error:", error);
    return []; // Return empty array so frontend doesn't break
  }
};

const getAISuggestions = async (payload: { symptoms: string }) => {
  const { symptoms } = payload;

  if (!symptoms) {
    throw new ApiError(httpStatus.BAD_REQUEST, "symptoms is required!");
  }

  const travelPlans = await prisma.travelPlan.findMany({
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

  const response = await openai.chat.completions.create({
    model: "meta-llama/llama-3.3-70b-instruct:free",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const aiText = response.choices[0]?.message?.content || "{}";

  let aiOutput;
  try {
    aiOutput = JSON.parse(aiText);
  } catch {
    const match = aiText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        aiOutput = JSON.parse(match[0]);
      } catch {
        throw new ApiError(500, "AI returned invalid JSON (after extraction)");
      }
    } else {
      throw new ApiError(500, "AI returned invalid JSON format");
    }
  }

  return {
    ai: aiOutput,
    availablePlans: travelPlans,
  };
};

const getMyTravelPlans = async (userId: string) => {
  console.log(`[Service] Getting travel plans for user: ${userId}`);

  const plans = await prisma.travelPlan.findMany({
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

  const result = plans.map((plan) => ({
    ...plan,
    status: getPlanStatus(plan.startDate, plan.endDate),
  }));

  // Debug: Check if buddies are included
  result.forEach((plan) => {
    console.log(
      `Plan ${plan.destination}: ${plan.buddies?.length || 0} buddies`
    );
  });

  return result;
};
const requestJoinTrip = async (travelPlanId: string, userId: string) => {
  const plan = await prisma.travelPlan.findUnique({
    where: { id: travelPlanId },
  });

  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  if (plan.userId === userId)
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot join your own trip");

  // Check if request already exists
  const existing = await prisma.travelBuddy.findUnique({
    where: { travelPlanId_userId: { travelPlanId, userId } },
  });

  if (existing)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Request already sent or processed"
    );

  // Create the Buddy entry
  const result = await prisma.travelBuddy.create({
    data: {
      travelPlanId,
      userId,
      status: "PENDING",
    },
  });

  // Create Notification for Host
  await prisma.notification.create({
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
};

const updateJoinRequestStatus = async (
  buddyId: string,
  hostId: string,
  status: "APPROVED" | "REJECTED"
) => {
  const buddyRecord = await prisma.travelBuddy.findUnique({
    where: { id: buddyId },
    include: { travelPlan: true },
  });

  if (!buddyRecord)
    throw new ApiError(httpStatus.NOT_FOUND, "Request not found");

  if (buddyRecord.travelPlan.userId !== hostId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not the host of this trip"
    );
  }

  const result = await prisma.travelBuddy.update({
    where: { id: buddyId },
    data: { status },
  });

  // ✅ FIX: Only send notification if it's APPROVED (matching your Enum)
  // Or handle REJECTED using a different message but same Enum if needed.
  if (status === "APPROVED") {
    await prisma.notification.create({
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
};

const getMyTripRequests = async (userId: string) => {
  // Get all pending join requests for user's plans
  const requests = await prisma.travelBuddy.findMany({
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
  return requests.map((request) => ({
    id: request.id, // This is the buddyId
    status: request.status,
    user: request.user,
    travelPlan: {
      id: request.travelPlan.id,
      destination: request.travelPlan.destination,
      startDate: request.travelPlan.startDate.toISOString(),
      endDate: request.travelPlan.endDate?.toISOString(),
    },
    createdAt: request.createdAt.toISOString(),
  }));
};
// Update getMyTravelPlans to include buddies (needed for the UI)
const getMyTravelPlansWithBuddies = async (userId: string) => {
  return await prisma.travelPlan.findMany({
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
};

export const TravelPlanService = {
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
