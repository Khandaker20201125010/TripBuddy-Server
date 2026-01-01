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
exports.ConnectionController = void 0;
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const connection_service_1 = require("./connection.service");
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const getAllConnections = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield connection_service_1.ConnectionService.getAllUserConnections(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "All connections retrieved successfully",
        data: result,
    });
}));
const sendRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const body = req.body;
    if (!user || !user.id) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "User ID missing from token");
    }
    const senderId = user.id;
    const { receiverId } = body;
    if (!receiverId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Receiver ID is missing");
    }
    const result = yield connection_service_1.ConnectionService.sendConnectionRequest(senderId, receiverId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Connection request sent successfully",
        data: result,
    });
}));
const updateStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { connectionId } = req.params;
    const { status } = req.body;
    const result = yield connection_service_1.ConnectionService.respondToRequest(userId, connectionId, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `Request ${status.toLowerCase()} successfully`,
        data: result,
    });
}));
const getIncomingRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield connection_service_1.ConnectionService.getIncomingConnectionRequests(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Incoming connection requests retrieved successfully",
        data: result,
    });
}));
const getBuddies = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield connection_service_1.ConnectionService.getMyBuddies(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Buddies retrieved successfully",
        data: result,
    });
}));
const deleteConnection = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { connectionId } = req.params;
    yield connection_service_1.ConnectionService.deleteConnection(connectionId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Connection removed successfully",
        data: null,
    });
}));
exports.ConnectionController = {
    sendRequest,
    updateStatus,
    getIncomingRequests,
    getBuddies,
    deleteConnection,
    getAllConnections,
};
