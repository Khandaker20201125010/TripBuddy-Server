"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.error("❌ STRIPE_SECRET_KEY is missing in .env file");
    process.exit(1); // Exit process to prevent random crashes later
}
exports.stripe = new stripe_1.default(stripeKey, {
    // Use a stable, valid version. "2025-..." is not released publicly yet.
    apiVersion: "2025-11-17.clover",
    typescript: true,
});
