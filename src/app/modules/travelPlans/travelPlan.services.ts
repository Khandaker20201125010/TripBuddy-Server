import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { Prisma } from "@prisma/client";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";
import { travelPlanSearchableFields } from "./travelPlan.constant";
import { fileUploader } from "../../helper/fileUploader";
import { openai } from "../../helper/Open-Router";
import { getPlanStatus } from "../../helper/getPlanStatus";

const createTravelPlan = async (
  payload: any,
  userId: string,
  file?: Express.Multer.File
) => {
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
    // ✅ FIXED: Include user so frontend state updates correctly immediately
   include: {
        user: true 
    }
  });
};

const getAllTravelPlans = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const {
    searchTerm,
    minBudget,
    maxBudget,
    startDate,
    endDate,
    ...filterData
  } = params;

  const andConditions: Prisma.TravelPlanWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: travelPlanSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  if (minBudget || maxBudget) {
    andConditions.push({
      budget: {
        gte: minBudget ? Number(minBudget) : undefined,
        lte: maxBudget ? Number(maxBudget) : undefined,
      },
    });
  }

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

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: filterData[key],
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.travelPlan.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: { [sortBy]: sortOrder },
    include: { user: true },
  });

  const total = await prisma.travelPlan.count({ where: whereConditions });

  return { meta: { page, limit, total }, data: result };
};

const getSingleTravelPlan = async (id: string) => {
  const plan = await prisma.travelPlan.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, "Travel Plan not found");
  return plan;
};

const updateTravelPlan = async (
  id: string,
  userId: string,
  payload: any,
  file?: Express.Multer.File
) => {
  const existing = await prisma.travelPlan.findUnique({ where: { id } });

  if (!existing) throw new ApiError(404, "Travel Plan not found");
  if (existing.userId !== userId)
    throw new ApiError(403, "Unauthorized to update");

  let imageUrl = existing.image;

  if (file) {
    const cloudResult = await fileUploader.uploadToCloudinary(file);
    imageUrl = cloudResult.secure_url;
  }

  const updatedData: any = {};

  if (payload.destination !== undefined) updatedData.destination = payload.destination;
  if (payload.travelType !== undefined) updatedData.travelType = payload.travelType;
  if (payload.description !== undefined) updatedData.description = payload.description;
  if (payload.visibility !== undefined)
    updatedData.visibility = payload.visibility === true || payload.visibility === "true";
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

const deleteTravelPlan = async (id: string, userId: string) => {
  const existing = await prisma.travelPlan.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Not found");
  if (existing.userId !== userId)
    throw new ApiError(403, "Unauthorized to delete");

  await prisma.travelPlan.delete({ where: { id } });

  return { message: "Travel Plan deleted successfully" };
};

const matchTravelPlans = async (filters: any) => {
  const { destination, startDate, endDate, travelType, searchTerm } = filters;

  return prisma.travelPlan.findMany({
    where: {
      AND: [
        searchTerm
          ? {
              OR: [
                { destination: { contains: searchTerm, mode: "insensitive" } },
                { travelType: { contains: searchTerm, mode: "insensitive" } },
              ],
            }
          : {},
        destination
          ? { destination: { contains: destination, mode: "insensitive" } }
          : {},
        travelType
          ? { travelType: { contains: travelType, mode: "insensitive" } }
          : {},
        startDate ? { startDate: { gte: new Date(startDate) } } : {},
        endDate ? { endDate: { lte: new Date(endDate) } } : {},
      ],
    },
    include: { user: true },
  });
};

const getRecommendedTravelers = async (userId: string) => {
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) return [];

  const interests = currentUser.interests; 

  const recommendedTravelers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      interests: { hasSome: interests },
      status: "ACTIVE",
    },
    take: 6,
    include: {
      travelPlans: true,
    },
  });

  return recommendedTravelers;
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
  const plans = await prisma.travelPlan.findMany({
    where: { userId },
    orderBy: { startDate: "asc" },
    include: { user: true },
  });

  return plans.map((plan) => ({
    ...plan,
    status: getPlanStatus(plan.startDate, plan.endDate),
  }));
};

export const TravelPlanService = {
  createTravelPlan,
  getAllTravelPlans,
  getSingleTravelPlan,
  updateTravelPlan,
  deleteTravelPlan,
  matchTravelPlans,
  getAISuggestions,
  getRecommendedTravelers,
  getMyTravelPlans,
};