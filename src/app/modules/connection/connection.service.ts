import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { ConnectionStatus } from "@prisma/client";

const sendConnectionRequest = async (senderId: string, receiverId: string) => {
  // 1. Validation: Self-connection check
  if (senderId === receiverId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot connect with yourself");
  }

  // 2. Fetch Sender (with subscription info) and Receiver
  const sender = await prisma.user.findUnique({ 
    where: { id: senderId } 
  });
  const receiver = await prisma.user.findUnique({ 
    where: { id: receiverId } 
  });

  if (!sender) throw new ApiError(httpStatus.UNAUTHORIZED, "Sender not found");
  if (!receiver) throw new ApiError(httpStatus.NOT_FOUND, "Receiver not found");

  // --- NEW: SUBSCRIPTION LIMIT LOGIC ---
  
  // Only count requests made in the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const requestCount = await prisma.connection.count({
    where: {
      senderId,
      createdAt: { gte: startOfMonth }
    }
  });

  const subType = sender.subscriptionType;

 
  if (!subType && requestCount >= 5) {
    throw new ApiError(httpStatus.FORBIDDEN, "Free limit reached (5 requests/month). Please subscribe to send more.");
  }

  if (subType === "EXPLORER" && requestCount >= 10) {
    throw new ApiError(httpStatus.FORBIDDEN, "Weekly plan limit reached (10 requests/month). Upgrade to Monthly for unlimited.");
  }

  const existingConnection = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }
  });

  if (existingConnection) {
    throw new ApiError(httpStatus.CONFLICT, `Connection already exists`);
  }

  // 4. Create the connection
  return await prisma.connection.create({
    data: { senderId, receiverId, status: "PENDING" }
  });
};
const respondToRequest = async (userId: string, connectionId: string, status: ConnectionStatus) => {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId }
  });

  if (!connection) {
    throw new ApiError(httpStatus.NOT_FOUND, "Connection request not found");
  }

  if (connection.receiverId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to respond to this request");
  }

  return await prisma.connection.update({
    where: { id: connectionId },
    data: { status }
  });
};

const getMyBuddies = async (userId: string) => {
  return await prisma.connection.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: "ACCEPTED"
    },
    include: {
      sender: { select: { id: true, name: true, profileImage: true } },
      receiver: { select: { id: true, name: true, profileImage: true } }
    }
  });
};
const getIncomingConnectionRequests = async (userId: string) => {
  const requests = await prisma.connection.findMany({
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
};
export const ConnectionService = {
  sendConnectionRequest,
  respondToRequest,
  getMyBuddies,
  getIncomingConnectionRequests
};