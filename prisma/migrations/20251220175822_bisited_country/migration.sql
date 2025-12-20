-- AlterTable
ALTER TABLE "users" ADD COLUMN     "visitedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];
