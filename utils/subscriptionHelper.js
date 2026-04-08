/**
 * Subscription and Download Limit Utilities
 */

// Subscription plan limits
const PLAN_LIMITS = {
  free: {
    downloadsPerMonth: 3,
    premiumAccess: false,
    commercialUse: false,
    aiToolsAccess: false,
  },
  basic: {
    downloadsPerMonth: 20,
    premiumAccess: false,
    commercialUse: true,
    aiToolsAccess: false,
  },
  premium: {
    downloadsPerMonth: 100,
    premiumAccess: true,
    commercialUse: true,
    aiToolsAccess: true,
  },
  enterprise: {
    downloadsPerMonth: -1, // Unlimited
    premiumAccess: true,
    commercialUse: true,
    aiToolsAccess: true,
  },
};

/**
 * Check if user can download based on their plan and limits
 */
const canUserDownload = (user, product) => {
  const plan = user.subscriptionPlan || "free";
  const limits = PLAN_LIMITS[plan];

  // Check if product requires premium and user doesn't have it
  if (product.isPremium && !limits.premiumAccess) {
    return {
      allowed: false,
      reason: "This is a premium asset. Please upgrade your plan.",
    };
  }

  // Check if user has reached monthly download limit
  if (limits.downloadsPerMonth !== -1) {
    // Reset monthly downloads if it's a new month
    const lastReset = new Date(user.lastDownloadReset);
    const now = new Date();

    if (
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear()
    ) {
      // Downloads will be reset in the controller
      return { allowed: true };
    }

    if (user.monthlyDownloads >= limits.downloadsPerMonth) {
      return {
        allowed: false,
        reason: `You've reached your monthly download limit of ${limits.downloadsPerMonth}. Please upgrade your plan.`,
      };
    }
  }

  return { allowed: true };
};

/**
 * Get user's available downloads remaining
 */
const getDownloadsRemaining = (user) => {
  const plan = user.subscriptionPlan || "free";
  const limits = PLAN_LIMITS[plan];

  if (limits.downloadsPerMonth === -1) {
    return "Unlimited";
  }

  // Check if reset is needed
  const lastReset = new Date(user.lastDownloadReset);
  const now = new Date();

  if (
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    return limits.downloadsPerMonth;
  }

  return Math.max(0, limits.downloadsPerMonth - user.monthlyDownloads);
};

/**
 * Check if subscription is active
 */
const isSubscriptionActive = (user) => {
  if (user.subscriptionPlan === "free") {
    return true;
  }

  if (user.subscriptionStatus !== "active") {
    return false;
  }

  if (
    user.subscriptionEndDate &&
    new Date(user.subscriptionEndDate) < new Date()
  ) {
    return false;
  }

  return true;
};

/**
 * Get next billing date
 */
const getNextBillingDate = (user) => {
  if (user.subscriptionPlan === "free") {
    return null;
  }

  return user.subscriptionEndDate;
};

/**
 * Reset monthly downloads if needed
 */
const resetMonthlyDownloadsIfNeeded = (user) => {
  const lastReset = new Date(user.lastDownloadReset);
  const now = new Date();

  if (
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    user.monthlyDownloads = 0;
    user.lastDownloadReset = now;
    return true;
  }

  return false;
};

module.exports = {
  PLAN_LIMITS,
  canUserDownload,
  getDownloadsRemaining,
  isSubscriptionActive,
  getNextBillingDate,
  resetMonthlyDownloadsIfNeeded,
};
