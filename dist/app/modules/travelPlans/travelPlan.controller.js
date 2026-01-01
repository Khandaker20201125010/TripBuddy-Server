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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPlanController = void 0;
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const travelPlan_services_1 = require("./travelPlan.services");
const pick_1 = __importDefault(require("../../helper/pick"));
const travelPlan_constant_1 = require("./travelPlan.constant");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const createTravelPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new ApiError_1.default(401, "Authentication required");
    }
    const payload = Object.assign(Object.assign({}, req.body), { budget: req.body.budget ? Number(req.body.budget) : 0, visibility: req.body.visibility === 'true' });
    // Service will throw an error if limit is reached
    const result = yield travelPlan_services_1.TravelPlanService.createTravelPlan(payload, req.user.id, req.file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Travel plan created successfully",
        data: result,
    });
}));
const getAllTravelPlans = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = (0, pick_1.default)(req.query, travelPlan_constant_1.travelPlanFilterableFields);
    const options = (0, pick_1.default)(req.query, ["page", "limit", "sortBy", "sortOrder"]);
    const user = req.user;
    const currentUserId = user === null || user === void 0 ? void 0 : user.id;
    const result = yield travelPlan_services_1.TravelPlanService.getAllTravelPlans(filters, options, currentUserId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Travel plans retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
}));
const getSingleTravelPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield travelPlan_services_1.TravelPlanService.getSingleTravelPlan(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Travel plan retrieved",
        data: result,
    });
}));
const updateTravelPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield travelPlan_services_1.TravelPlanService.updateTravelPlan(req.params.id, req.user.id, req.body, req.user.role, req.file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Travel plan updated successfully",
        data: result,
    });
}));
const getRecommendedTravelersController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const recommended = yield travelPlan_services_1.TravelPlanService.getRecommendedTravelers(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: 'Recommended travelers fetched successfully',
        data: recommended,
    });
}));
const deleteTravelPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role; // <--- Make sure your auth middleware populates this
    if (!userId)
        throw new ApiError_1.default(401, "You must be logged in");
    const result = yield travelPlan_services_1.TravelPlanService.deleteTravelPlan(id, userId, userRole);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Travel plan deleted successfully",
        data: result,
    });
}));
const getCommunityStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield travelPlan_services_1.TravelPlanService.getCommunityStats();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Community stats retrieved successfully",
        data: result,
    });
}));
const matchTravelPlans = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // 1. Extract filters
    const filters = {
        searchTerm: req.query.searchTerm,
        destination: req.query.destination,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        travelType: req.query.travelType,
    };
    // 2. Extract pagination and sorting (Ensure strict types)
    const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 6,
        sortBy: req.query.sortBy || "Best Match",
    };
    const currentUserId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || undefined;
    const result = yield travelPlan_services_1.TravelPlanService.matchTravelPlans(filters, options, currentUserId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Matched travel plans retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
}));
const getAISuggestions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield travelPlan_services_1.TravelPlanService.getAISuggestions(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "AI suggestions fetched successfully",
        data: result,
    });
}));
const getMyTripRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new ApiError_1.default(401, "User ID not found in token");
    }
    console.log(`Fetching trip requests for user: ${userId}`); // Debug log
    const result = yield travelPlan_services_1.TravelPlanService.getMyTripRequests(userId);
    console.log(`Found ${result.length} trip requests`); // Debug log
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Trip requests retrieved successfully",
        data: result,
    });
}));
const getMyTravelPlans = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new ApiError_1.default(401, "User ID not found in token");
    }
    // ✅ CHANGE THIS: Use the service that includes buddies and users
    const result = yield travelPlan_services_1.TravelPlanService.getMyTravelPlansWithBuddies(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "My travel plans with requests retrieved successfully",
        data: result,
    });
}));
const requestJoinTrip = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield travelPlan_services_1.TravelPlanService.requestJoinTrip(req.params.id, req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Join request sent successfully",
        data: result,
    });
}));
const updateJoinRequestStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { buddyId } = req.params;
    const { status } = req.body;
    const hostId = req.user.id;
    const result = yield travelPlan_services_1.TravelPlanService.updateJoinRequestStatus(buddyId, hostId, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `Join request ${status.toLowerCase()} successfully`,
        data: result,
    });
}));
exports.TravelPlanController = {
    createTravelPlan,
    getAllTravelPlans,
    getSingleTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
    getAISuggestions,
    getCommunityStats,
    matchTravelPlans,
    getRecommendedTravelersController,
    getMyTravelPlans,
    requestJoinTrip,
    updateJoinRequestStatus,
    getMyTripRequests
};
