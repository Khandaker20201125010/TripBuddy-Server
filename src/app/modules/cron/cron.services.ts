// src/app/modules/cron/cron.ts

import cron from 'node-cron';
import { prisma } from '../../shared/prisma';

const notifyUsersToReview = async () => {
  const now = new Date();
  
  const endedTrips = await prisma.travelPlan.findMany({
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
        const existingNotif = await prisma.notification.findFirst({
            where: {
                userId: buddy.userId,
                travelPlanId: trip.id,
                type: 'LEAVE_REVIEW'
            }
        });

        if (!existingNotif) {
          await prisma.notification.create({
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
};

// Run every day at midnight (0 0 * * *)
export const initCronJobs = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('Running Cron: Checking for past trips to request reviews...');
    notifyUsersToReview();
  });
};