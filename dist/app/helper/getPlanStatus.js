"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanStatus = void 0;
const getPlanStatus = (start, end) => {
    const now = new Date();
    if (end < now)
        return "COMPLETED";
    if (start > now)
        return "UPCOMING";
    return "ONGOING";
};
exports.getPlanStatus = getPlanStatus;
