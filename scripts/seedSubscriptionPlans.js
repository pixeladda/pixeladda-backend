/**
 * Seed Subscription Plans
 * Run this script to initialize subscription plans in the database
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { SubscriptionPlan } = require("../models/Subscription");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUBSCRIPTION_PLANS = [
  {
    name: "free",
    displayName: "Free",
    description: "Perfect for trying out PixelAdda",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      downloadsPerMonth: 3,
      premiumAccess: false,
      aiToolsAccess: false,
      commercialUse: false,
    },
    features: [
      "3 downloads per month",
      "Access to free assets",
      "Standard license",
      "Community support",
    ],
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "basic",
    displayName: "Basic",
    description: "For individuals and freelancers",
    price: {
      monthly: 499,
      yearly: 4990,
    },
    limits: {
      downloadsPerMonth: 20,
      premiumAccess: false,
      aiToolsAccess: false,
      commercialUse: true,
    },
    features: [
      "20 downloads per month",
      "Access to free assets",
      "Commercial use license",
      "Priority support",
      "No attribution required",
    ],
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "premium",
    displayName: "Premium",
    description: "For professionals and teams",
    price: {
      monthly: 999,
      yearly: 9990,
    },
    limits: {
      downloadsPerMonth: 100,
      premiumAccess: true,
      aiToolsAccess: true,
      commercialUse: true,
    },
    features: [
      "100 downloads per month",
      "Access to all premium assets",
      "AI-powered tools",
      "Commercial use license",
      "Priority support",
      "Early access to new features",
      "No attribution required",
    ],
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "enterprise",
    displayName: "Enterprise",
    description: "For agencies and large teams",
    price: {
      monthly: 2999,
      yearly: 29990,
    },
    limits: {
      downloadsPerMonth: -1, // Unlimited
      premiumAccess: true,
      aiToolsAccess: true,
      commercialUse: true,
    },
    features: [
      "Unlimited downloads",
      "Access to all premium assets",
      "AI-powered tools",
      "Commercial use license",
      "Dedicated account manager",
      "Custom licensing options",
      "Team collaboration tools",
      "API access",
      "No attribution required",
    ],
    sortOrder: 4,
    isActive: true,
  },
];

const seedSubscriptionPlans = async () => {
  try {
    console.log("🌱 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME,
    });

    console.log("✅ Connected to MongoDB");
    console.log("🗑️  Clearing existing subscription plans...");

    await SubscriptionPlan.deleteMany({});

    console.log("📦 Creating subscription plans...");

    for (const plan of SUBSCRIPTION_PLANS) {
      await SubscriptionPlan.create(plan);
      console.log(`   ✓ Created ${plan.displayName} plan`);
    }

    console.log("\n✨ Subscription plans seeded successfully!");
    console.log(`   Total plans: ${SUBSCRIPTION_PLANS.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error);
    process.exit(1);
  }
};

seedSubscriptionPlans();
