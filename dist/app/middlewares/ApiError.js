"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        // restore prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.default = ApiError;
