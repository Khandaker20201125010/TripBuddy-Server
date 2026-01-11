// backend/src/modules/location/location.controller.ts
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { Request, Response } from "express";
import { LocationService } from "./location.service";


// Helper to get client IP
const getClientIP = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0].split(',')[0].trim();
    }
    return xForwardedFor.split(',')[0].trim();
  }
  
  // Check other headers
  const headersToCheck = [
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'true-client-ip', // Akamai
  ];
  
  for (const header of headersToCheck) {
    const value = req.headers[header];
    if (value) {
      if (Array.isArray(value)) {
        return value[0].split(',')[0].trim();
      }
      return value.split(',')[0].trim();
    }
  }
  
  return req.ip || req.socket.remoteAddress || req.connection.remoteAddress || '127.0.0.1';
};

// Auto-detect location from IP
const detectLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const clientIp = getClientIP(req);
  console.log(`Detecting location for user ${id} from IP: ${clientIp}`);
  
  const locationData = await LocationService.getLocationFromIP(clientIp);
  console.log(`Detected location: ${locationData.city}, ${locationData.country} (Source: ${locationData.source})`);
  
  const result = await LocationService.updateUserLocation(id, locationData);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Location detected and saved (Source: ${locationData.source})`,
    data: result
  });
});

// Update location from browser coordinates
const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Latitude and longitude are required",
      data: null
    });
  }
  
  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Invalid coordinates provided",
      data: null
    });
  }
  
  const result = await LocationService.updateLocationFromCoordinates(id, latitude, longitude);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Location updated successfully from browser geolocation",
    data: result
  });
});

// Get user location
const getUserLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await LocationService.getUserLocation(id);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Location retrieved successfully",
      data: result
    });
  } catch (error: any) {
    if (error.statusCode === httpStatus.NOT_FOUND || error.message.includes("not found")) {
      // If no location found, create one
      const clientIp = getClientIP(req);
      const result = await LocationService.getOrCreateUserLocation(id, clientIp);
      
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Location created and retrieved",
        data: result
      });
    } else {
      throw error;
    }
  }
});

// Get or create location
const getOrCreateLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const clientIp = getClientIP(req);
  
  console.log(`Getting/creating location for user ${id} from IP: ${clientIp}`);
  
  const result = await LocationService.getOrCreateUserLocation(id, clientIp);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.locationUpdatedAt ? "Location retrieved" : "Location created",
    data: result
  });
});

// Set manual location
const setManualLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { country, city, latitude, longitude } = req.body;
  
  if (!country || !city) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Country and city are required",
      data: null
    });
  }
  
  const result = await LocationService.setManualLocation(
    id, 
    country, 
    city, 
    latitude, 
    longitude
  );
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Location set manually",
    data: result
  });
});

export const LocationController = {
  detectLocation,
  updateLocation,
  getUserLocation,
  getOrCreateLocation,
  setManualLocation
};