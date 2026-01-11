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
exports.LocationController = void 0;
// backend/src/modules/location/location.controller.ts
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const location_service_1 = require("./location.service");
// Helper to get client IP
const getClientIP = (req) => {
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
const detectLocation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const clientIp = getClientIP(req);
    console.log(`Detecting location for user ${id} from IP: ${clientIp}`);
    const locationData = yield location_service_1.LocationService.getLocationFromIP(clientIp);
    console.log(`Detected location: ${locationData.city}, ${locationData.country} (Source: ${locationData.source})`);
    const result = yield location_service_1.LocationService.updateUserLocation(id, locationData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `Location detected and saved (Source: ${locationData.source})`,
        data: result
    });
}));
// Update location from browser coordinates
const updateLocation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Latitude and longitude are required",
            data: null
        });
    }
    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Invalid coordinates provided",
            data: null
        });
    }
    const result = yield location_service_1.LocationService.updateLocationFromCoordinates(id, latitude, longitude);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Location updated successfully from browser geolocation",
        data: result
    });
}));
// Get user location
const getUserLocation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield location_service_1.LocationService.getUserLocation(id);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Location retrieved successfully",
            data: result
        });
    }
    catch (error) {
        if (error.statusCode === http_status_1.default.NOT_FOUND || error.message.includes("not found")) {
            // If no location found, create one
            const clientIp = getClientIP(req);
            const result = yield location_service_1.LocationService.getOrCreateUserLocation(id, clientIp);
            (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: "Location created and retrieved",
                data: result
            });
        }
        else {
            throw error;
        }
    }
}));
// Get or create location
const getOrCreateLocation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const clientIp = getClientIP(req);
    console.log(`Getting/creating location for user ${id} from IP: ${clientIp}`);
    const result = yield location_service_1.LocationService.getOrCreateUserLocation(id, clientIp);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: result.locationUpdatedAt ? "Location retrieved" : "Location created",
        data: result
    });
}));
// Set manual location
const setManualLocation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { country, city, latitude, longitude } = req.body;
    if (!country || !city) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Country and city are required",
            data: null
        });
    }
    const result = yield location_service_1.LocationService.setManualLocation(id, country, city, latitude, longitude);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Location set manually",
        data: result
    });
}));
exports.LocationController = {
    detectLocation,
    updateLocation,
    getUserLocation,
    getOrCreateLocation,
    setManualLocation
};
