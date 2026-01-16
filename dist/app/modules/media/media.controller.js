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
exports.MediaController = void 0;
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const media_services_1 = require("./media.services");
const pick_1 = __importDefault(require("../../helper/pick"));
const media_constant_1 = require("./media.constant");
const createMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new Error("User not authenticated");
    }
    const mediaData = {
        caption: req.body.caption,
        location: req.body.location,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        travelPlanId: req.body.travelPlanId,
    };
    const result = yield media_services_1.MediaService.createMediaPost(userId, mediaData, req.file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Media post created successfully",
        data: result,
    });
}));
const getAllMediaPosts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const filters = (0, pick_1.default)(req.query, media_constant_1.mediaFilterableFields);
    const options = (0, pick_1.default)(req.query, ["page", "limit", "sortBy", "sortOrder"]);
    const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield media_services_1.MediaService.getAllMediaPosts(filters, options, currentUserId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Media posts retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
}));
const getMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield media_services_1.MediaService.getMediaPostById(id, currentUserId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Media post retrieved successfully",
        data: result,
    });
}));
const toggleLikeMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    const result = yield media_services_1.MediaService.toggleLike(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: result.liked
            ? "Post liked successfully"
            : "Post unliked successfully",
        data: result,
    });
}));
const addCommentToMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, parentId } = req.body;
    const result = yield media_services_1.MediaService.addComment(id, userId, content, parentId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Comment added successfully",
        data: result,
    });
}));
const shareMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    const result = yield media_services_1.MediaService.shareMediaPost(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Post shared successfully",
        data: result,
    });
}));
const deleteMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    const result = yield media_services_1.MediaService.deleteMediaPost(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Media post deleted successfully",
        data: result,
    });
}));
const getUserMediaPosts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { userId } = req.params;
    const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield media_services_1.MediaService.getUserMediaPosts(userId, currentUserId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User media posts retrieved successfully",
        data: result,
    });
}));
const updateMediaPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    const { caption, location, tags } = req.body;
    const result = yield media_services_1.MediaService.updateMediaPost(id, userId, {
        caption,
        location,
        tags: tags ? JSON.parse(tags) : [],
    }, req.file); // Pass the file if it exists
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Media post updated successfully",
        data: result,
    });
}));
exports.MediaController = {
    createMediaPost,
    getAllMediaPosts,
    getMediaPost,
    toggleLikeMediaPost,
    addCommentToMediaPost,
    shareMediaPost,
    deleteMediaPost,
    getUserMediaPosts,
    updateMediaPost,
};
