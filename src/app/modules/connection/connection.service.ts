import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";
import { ConnectionStatus } from "@prisma/client";

const getAllUserConnections = async (userId: string) => {
  const connections = await prisma.connection.findMany({
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
};

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

  // 3. Check for existing REJECTED connection and delete it if exists
  const existingRejected = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId, status: "REJECTED" },
        { senderId: receiverId, receiverId: senderId, status: "REJECTED" }
      ]
    }
  });

  // Delete rejected connection if it exists
  if (existingRejected) {
    await prisma.connection.delete({
      where: { id: existingRejected.id }
    });
  }

  // 4. Check subscription limits
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

  // 5. Check for existing connection (non-REJECTED)
  const existingConnection = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ],
      status: { not: "REJECTED" } // Only check non-rejected connections
    }
  });

  if (existingConnection) {
    throw new ApiError(httpStatus.CONFLICT, `Connection already exists`);
  }

  // 6. Create the connection
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

const deleteConnection = async (connectionId: string, userId: string) => {
  // Find the connection
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId }
  });

  if (!connection) {
    throw new ApiError(httpStatus.NOT_FOUND, "Connection not found");
  }

  // Check if user is part of the connection
  if (connection.senderId !== userId && connection.receiverId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this connection");
  }

  // Delete the connection
  return await prisma.connection.delete({
    where: { id: connectionId }
  });
};

export const ConnectionService = {
  sendConnectionRequest,
  respondToRequest,
  getMyBuddies,
  getIncomingConnectionRequests,
  deleteConnection,
  getAllUserConnections
};