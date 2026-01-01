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
const jwtHelper_1 = require("../helper/jwtHelper");
const config_1 = __importDefault(require("../config"));
const ApiError_1 = __importDefault(require("./ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const auth = (...roles) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            let token = req.headers.authorization;
            if (token && token.startsWith("Bearer ")) {
                token = token.split(" ")[1];
            }
            else {
                token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
            }
            if (!token) {
                throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "You are not authorized! Token missing.");
            }
            let verifyUser;
            try {
                verifyUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.access_secret);
            }
            catch (error) {
                // CATCH JWT ERRORS HERE TO PREVENT 500
                throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Token expired or invalid");
            }
            req.user = verifyUser;
            if (roles.length && !roles.includes(verifyUser.role)) {
                throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Forbidden");
            }
            next();
        }
        catch (err) {
            next(err);
        }
    });
};
exports.default = auth;
