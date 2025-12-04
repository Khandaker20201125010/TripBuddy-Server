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
const travelPlan_constant_1 = require("./travelPlan.constant");
const fileUploader_1 = require("../../helper/fileUploader");
const createTravelPlan = (payload, userId, file) => __awaiter(void 0, void 0, void 0, function* () {
    let imageUrl = null;
    if (file) {
        const cloudResult = yield fileUploader_1.fileUploader.uploadToCloudinary(file);
        imageUrl = cloudResult.secure_url;
    }
    return yield prisma_1.prisma.travelPlan.create({
        data: Object.assign(Object.assign({}, payload), { image: imageUrl, budget: Number(payload.budget), userId, startDate: new Date(payload.startDate), endDate: new Date(payload.endDate) }),
    });
});
const getAllTravelPlans = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm, minBudget, maxBudget, startDate, endDate } = params, filterData = __rest(params, ["searchTerm", "minBudget", "maxBudget", "startDate", "endDate"]);
    const andConditions = [];
    // search (destination / travelType)
    if (searchTerm) {
        andConditions.push({
            OR: travelPlan_constant_1.travelPlanSearchableFields.map((field) => ({
                [field]: { contains: searchTerm, mode: "insensitive" },
            })),
        });
    }
    // budget filter
    if (minBudget || maxBudget) {
        andConditions.push({
            budget: {
                gte: minBudget ? Number(minBudget) : undefined,
                lte: maxBudget ? Number(maxBudget) : undefined,
            },
        });
    }
    // date filter
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
    // direct filter
    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: filterData[key],
            })),
        });
    }
    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};
    const result = yield prisma_1.prisma.travelPlan.findMany({
        skip,
        take: limit,
        where: whereConditions,
        orderBy: { [sortBy]: sortOrder },
        include: { user: true },
    });
    const total = yield prisma_1.prisma.travelPlan.count({ where: whereConditions });
    return { meta: { page, limit, total }, data: result };
});
const getSingleTravelPlan = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const plan = yield prisma_1.prisma.travelPlan.findUnique({
        where: { id },
        include: { user: true },
    });
    if (!plan)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Travel Plan not found");
    return plan;
});
const updateTravelPlan = (id, userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma_1.prisma.travelPlan.findUnique({ where: { id } });
    if (!existing)
        throw new ApiError_1.default(404, "Travel Plan not found");
    if (existing.userId !== userId)
        throw new ApiError_1.default(403, "Unauthorized to update");
    // Convert values if provided
    const updatedData = Object.assign({}, payload);
    if (payload.budget)
        updatedData.budget = Number(payload.budget);
    if (payload.startDate)
        updatedData.startDate = new Date(payload.startDate);
    if (payload.endDate)
        updatedData.endDate = new Date(payload.endDate);
    return prisma_1.prisma.travelPlan.update({
        where: { id },
        data: updatedData,
    });
});
const deleteTravelPlan = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma_1.prisma.travelPlan.findUnique({ where: { id } });
    if (!existing)
        throw new ApiError_1.default(404, "Not found");
    if (existing.userId !== userId)
        throw new ApiError_1.default(403, "Unauthorized to delete");
    yield prisma_1.prisma.travelPlan.delete({ where: { id } });
    return { message: "Travel Plan deleted successfully" };
});
const matchTravelPlans = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const { destination, startDate, endDate, travelType } = filters;
    return prisma_1.prisma.travelPlan.findMany({
        where: {
            AND: [
                destination ? { destination: { contains: destination, mode: "insensitive" } } : {},
                travelType ? { travelType } : {},
                startDate ? { startDate: { gte: new Date(startDate) } } : {},
                endDate ? { endDate: { lte: new Date(endDate) } } : {},
            ],
        },
        include: { user: true },
    });
});
exports.TravelPlanService = {
    createTravelPlan,
    getAllTravelPlans,
    getSingleTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
    matchTravelPlans,
};
