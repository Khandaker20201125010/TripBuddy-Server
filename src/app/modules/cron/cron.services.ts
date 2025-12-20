// src/app/modules/cron/cron.ts

import cron from 'node-cron';
import { prisma } from '../../shared/prisma';

const notifyUsersToReview = async () => {
  const now = new Date();

  // 1. Find trips that ended in the past
  const endedTrips = await prisma.travelPlan.findMany({
    where: {
      endDate: { lt: now }, 
    },
    include: {
      buddies: {
        where: { status: 'APPROVED' } // Only approved buddies need to review
      },
      reviews: true // Get existing reviews to avoid spamming
    }
  });

  for (const trip of endedTrips) {
    for (const buddy of trip.buddies) {
      
      // Check if this buddy already reviewed
      const hasReviewed = trip.reviews.some(r => r.reviewerId === buddy.userId);

      if (!hasReviewed) {
        // Check if we already sent a notification recently
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: buddy.userId,
            travelPlanId: trip.id,
            type: 'LEAVE_REVIEW' // Ensure this Enum exists in schema.prisma
          }
        });

        if (!existingNotif) {
          // Create Notification
          await prisma.notification.create({
            data: {
              userId: buddy.userId,
              travelPlanId: trip.id,
              message: `Your trip to ${trip.destination} has ended! Please rate your host.`,
              type: 'LEAVE_REVIEW',
              link: `/trips/${trip.id}` 
            }
          });
          console.log(`Review Notification sent to User ${buddy.userId} for Trip ${trip.id}`);
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