import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error("❌ STRIPE_SECRET_KEY is missing in .env file");
  process.exit(1); // Exit process to prevent random crashes later
}

export const stripe = new Stripe(stripeKey, {
  // Use a stable, valid version. "2025-..." is not released publicly yet.
  apiVersion: "2025-11-17.clover", 
  typescript: true,
});