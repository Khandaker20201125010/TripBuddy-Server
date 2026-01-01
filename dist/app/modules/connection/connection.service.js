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
exports.ConnectionService = void 0;
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const getAllUserConnections = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const connections = yield prisma_1.prisma.connection.findMany({
        where: {
            OR: [{ senderId: userId }, { receiverId: userId }]
        },
        include: {
            sender: { select: { id: true, name: true, profileImage: true, email: true } },
            receiver: { select: { id: true, name: true, profileImage: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return connections.map(conn => ({
        id: conn.id,
        status: conn.status,
        senderId: conn.senderId,
        receiverId: conn.receiverId,
        createdAt: conn.createdAt.toISOString(),
        updatedAt: conn.updatedAt.toISOString(),
        sender: conn.sender,
        receiver: conn.receiver
    }));
});
const sendConnectionRequest = (senderId, receiverId) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Validation: Self-connection check
    if (senderId === receiverId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "You cannot connect with yourself");
    }
    // 2. Fetch Sender (with subscription info) and Receiver
    const sender = yield prisma_1.prisma.user.findUnique({
        where: { id: senderId }
    });
    const receiver = yield prisma_1.prisma.user.findUnique({
        where: { id: receiverId }
    });
    if (!sender)
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Sender not found");
    if (!receiver)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Receiver not found");
    // 3. Check for existing REJECTED connection and delete it if exists
    const existingRejected = yield prisma_1.prisma.connection.findFirst({
        where: {
            OR: [
                { senderId, receiverId, status: "REJECTED" },
                { senderId: receiverId, receiverId: senderId, status: "REJECTED" }
            ]
        }
    });
    // Delete rejected connection if it exists
    if (existingRejected) {
        yield prisma_1.prisma.connection.delete({
            where: { id: existingRejected.id }
        });
    }
    // 4. Check subscription limits
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestCount = yield prisma_1.prisma.connection.count({
        where: {
            senderId,
            createdAt: { gte: startOfMonth }
        }
    });
    const subType = sender.subscriptionType;
    if (!subType && requestCount >= 5) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Free limit reached (5 requests/month). Please subscribe to send more.");
    }
    if (subType === "EXPLORER" && requestCount >= 10) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Weekly plan limit reached (10 requests/month). Upgrade to Monthly for unlimited.");
    }
    // 5. Check for existing connection (non-REJECTED)
    const existingConnection = yield prisma_1.prisma.connection.findFirst({
        where: {
            OR: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ],
            status: { not: "REJECTED" } // Only check non-rejected connections
        }
    });
    if (existingConnection) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, `Connection already exists`);
    }
    // 6. Create the connection
    return yield prisma_1.prisma.connection.create({
        data: { senderId, receiverId, status: "PENDING" }
    });
});
const respondToRequest = (userId, connectionId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield prisma_1.prisma.connection.findUnique({
        where: { id: connectionId }
    });
    if (!connection) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Connection request not found");
    }
    if (connection.receiverId !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You are not authorized to respond to this request");
    }
    return yield prisma_1.prisma.connection.update({
        where: { id: connectionId },
        data: { status }
    });
});
const getMyBuddies = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.connection.findMany({
        where: {
            OR: [{ senderId: userId }, { receiverId: userId }],
            status: "ACCEPTED"
        },
        include: {
            sender: { select: { id: true, name: true, profileImage: true } },
            receiver: { select: { id: true, name: true, profileImage: true } }
        }
    });
});
const getIncomingConnectionRequests = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const requests = yield prisma_1.prisma.connection.findMany({
        where: {
            receiverId: userId,
            status: "PENDING"
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    profileImage: true,
                    email: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    return requests.map(request => ({
        id: request.id,
        status: request.status,
        sender: request.sender,
        createdAt: request.createdAt.toISOString()
    }));
});
const deleteConnection = (connectionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Find the connection
    const connection = yield prisma_1.prisma.connection.findUnique({
        where: { id: connectionId }
    });
    if (!connection) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Connection not found");
    }
    // Check if user is part of the connection
    if (connection.senderId !== userId && connection.receiverId !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You are not authorized to delete this connection");
    }
    // Delete the connection
    return yield prisma_1.prisma.connection.delete({
        where: { id: connectionId }
    });
});
exports.ConnectionService = {
    sendConnectionRequest,
    respondToRequest,
    getMyBuddies,
    getIncomingConnectionRequests,
    deleteConnection,
    getAllUserConnections
};
