"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDDMMYYYY = void 0;
const ApiError_1 = __importDefault(require("../middlewares/ApiError"));
const parseDDMMYYYY = (value) => {
    const [day, month, year] = value.split("-").map(Number);
    if (!day || !month || !year) {
        throw new ApiError_1.default(httpStatus.BAD_REQUEST, "Date must be in DD-MM-YYYY format");
    }
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
        throw new ApiError_1.default(httpStatus.BAD_REQUEST, "Invalid date value");
    }
    return date;
};
exports.parseDDMMYYYY = parseDDMMYYYY;
