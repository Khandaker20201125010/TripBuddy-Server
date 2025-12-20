-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_travelPlanId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_travelPlanId_fkey";

-- DropForeignKey
ALTER TABLE "TravelBuddy" DROP CONSTRAINT "TravelBuddy_travelPlanId_fkey";

-- AddForeignKey
ALTER TABLE "TravelBuddy" ADD CONSTRAINT "TravelBuddy_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
