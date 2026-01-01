"use strict";
// src/app/modules/cron/cron.ts
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
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../../shared/prisma");
const notifyUsersToReview = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const endedTrips = yield prisma_1.prisma.travelPlan.findMany({
        where: { endDate: { lt: now } },
        include: {
            buddies: { where: { status: 'APPROVED' } },
            reviews: true
        }
    });
    for (const trip of endedTrips) {
        for (const buddy of trip.buddies) {
            const hasReviewed = trip.reviews.some(r => r.reviewerId === buddy.userId);
            if (!hasReviewed) {
                const existingNotif = yield prisma_1.prisma.notification.findFirst({
                    where: {
                        userId: buddy.userId,
                        travelPlanId: trip.id,
                        type: 'LEAVE_REVIEW'
                    }
                });
                if (!existingNotif) {
                    yield prisma_1.prisma.notification.create({
                        data: {
                            userId: buddy.userId,
                            travelPlanId: trip.id,
                            message: `How was ${trip.destination}? Rate your host now!`,
                            type: 'LEAVE_REVIEW',
                            // ✅ ADD THIS PARAMETER
                            link: `/trips/${trip.id}?triggerReview=true`
                        }
                    });
                    console.log(`Notification sent to ${buddy.userId}`);
                }
            }
        }
    }
});
// Run every day at midnight (0 0 * * *)
const initCronJobs = () => {
    node_cron_1.default.schedule('0 0 * * *', () => {
        console.log('Running Cron: Checking for past trips to request reviews...');
        notifyUsersToReview();
    });
};
exports.initCronJobs = initCronJobs;
