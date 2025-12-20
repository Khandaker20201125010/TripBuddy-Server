/*
  Warnings:

  - You are about to drop the column `interests` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `premium` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionExpiresAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `visitedCountries` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BuddyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRIP_INVITE', 'TRIP_JOIN_REQUEST', 'TRIP_APPROVED', 'LEAVE_REVIEW');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "interests",
DROP COLUMN "premium",
DROP COLUMN "subscriptionExpiresAt",
DROP COLUMN "visitedCountries";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "admins";

-- CreateTable
CREATE TABLE "TravelBuddy" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BuddyStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelBuddy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "travelPlanId" TEXT,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelBuddy_travelPlanId_userId_key" ON "TravelBuddy"("travelPlanId", "userId");

-- AddForeignKey
ALTER TABLE "TravelBuddy" ADD CONSTRAINT "TravelBuddy_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelBuddy" ADD CONSTRAINT "TravelBuddy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
