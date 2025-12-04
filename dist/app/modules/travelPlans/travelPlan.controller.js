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
const fileUploader_1 = require("../../helper/fileUploader");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const createTravelPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new ApiError_1.default(401, "Authentication required");
    }
    const result = yield travelPlan_services_1.TravelPlanService.createTravelPlan(req.body, req.user.id, req.file);
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
    const result = yield travelPlan_services_1.TravelPlanService.getAllTravelPlans(filters, options);
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
    let imageUrl = undefined;
    if (req.file) {
        const cloudResult = yield fileUploader_1.fileUploader.uploadToCloudinary(req.file);
        imageUrl = cloudResult.secure_url;
    }
    const data = Object.assign(Object.assign({}, req.body), (imageUrl && { image: imageUrl }));
    const result = yield travelPlan_services_1.TravelPlanService.updateTravelPlan(req.params.id, req.user.id, data);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Travel plan updated successfully",
        data: result,
    });
}));
const deleteTravelPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield travelPlan_services_1.TravelPlanService.deleteTravelPlan(req.params.id, req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Travel plan deleted",
        data: result,
    });
}));
exports.TravelPlanController = {
    createTravelPlan,
    getAllTravelPlans,
    getSingleTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
};
