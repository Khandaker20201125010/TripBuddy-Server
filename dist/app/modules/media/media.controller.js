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
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
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
    // IMPORTANT: Make sure user ID is being passed correctly
    const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    console.log(`🎯 getAllMediaPosts called with user ID: ${currentUserId || "not authenticated"}`);
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
    try {
        const { id } = req.params;
        const userId = req.user.id;
        console.log("Controller toggleLikeMediaPost called:", { id, userId });
        const result = yield media_services_1.MediaService.toggleLike(id, userId);
        console.log("Service result:", result);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: result.message ||
                (result.liked
                    ? "Post liked successfully"
                    : "Post unliked successfully"),
            data: {
                liked: result.liked,
                likesCount: result.likesCount,
                action: result.action,
                mediaPost: result.mediaPost,
            },
        });
    }
    catch (error) {
        console.error("Controller toggleLikeMediaPost error:", {
            message: error.message,
            code: error.code,
            stack: error.stack,
        });
        // Send proper error response
        (0, sendResponse_1.default)(res, {
            statusCode: error.statusCode || http_status_1.default.INTERNAL_SERVER_ERROR,
            success: false,
            message: error.message || "Failed to process like",
            data: error.data || null,
        });
    }
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
const updateComment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Debug logging
        console.log("Update comment endpoint called:", {
            params: req.params,
            body: req.body,
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
        });
        const { postId, commentId } = req.params;
        const userId = req.user.id;
        const { content } = req.body;
        // Validate parameters exist
        if (!postId || !commentId) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Missing postId or commentId in parameters");
        }
        // Validate content is provided
        if (!content || content.trim() === "") {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Comment content is required");
        }
        // Call service with all required parameters
        const result = yield media_services_1.MediaService.updateComment(postId, commentId, userId, content);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Comment updated successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Update comment controller error:", error);
        throw error;
    }
}));
const deleteComment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("Delete comment endpoint called:", {
            params: req.params,
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
        });
        const { postId, commentId } = req.params;
        const userId = req.user.id;
        // Validate parameters exist
        if (!postId || !commentId) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Missing postId or commentId in parameters");
        }
        const result = yield media_services_1.MediaService.deleteComment(postId, commentId, userId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Comment deleted successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Delete comment controller error:", error);
        throw error;
    }
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
    updateComment,
    deleteComment,
};
