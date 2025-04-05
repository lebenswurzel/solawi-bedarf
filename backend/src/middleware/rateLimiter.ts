/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import ratelimit from "koa-ratelimit";
import { config } from "../config";
import { Context, Next } from "koa";

// Function to get the real client IP
function getClientIdentifier(ctx: Context): string {
  // Try to get the real IP from various headers
  const forwardedFor = ctx.get("x-forwarded-for");
  const realIp = ctx.get("x-real-ip");
  const cfConnectingIp = ctx.get("cf-connecting-ip"); // Cloudflare

  // Get the first IP from x-forwarded-for if it exists
  const forwardedIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

  // Use the first available identifier in order of preference
  const ip = forwardedIp || realIp || cfConnectingIp || ctx.ip;

  // Additional identifiers for better uniqueness
  const userAgent = ctx.get("user-agent") || "unknown";
  const acceptLanguage = ctx.get("accept-language") || "unknown";

  // Create a composite identifier
  return `${ip}:${userAgent.substring(0, 50)}:${acceptLanguage.substring(0, 10)}`;
}

// Rate limit configuration for different types of routes
const rateLimits = {
  // Stricter limits for authentication routes
  auth: {
    duration: 10 * 60 * 1000, // 10 minutes
    max: 15, // 15 requests per 10 minutes
  },
  // Moderate limits for API routes
  api: {
    duration: 60 * 1000, // 1 minute
    max: 250, // 250 requests per minute
  },
  // More lenient limits for public routes
  public: {
    duration: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
  },
};

// Store for rate limit counters
const rateLimitStore = new Map();

// Helper function to get the appropriate rate limit based on the route
function getRateLimitForPath(path: string) {
  if (path.startsWith("/user/token")) {
    return rateLimits.auth;
  }
  if (
    path.startsWith("/user") ||
    path.startsWith("/config") ||
    path.startsWith("/depot")
  ) {
    return rateLimits.api;
  }
  return rateLimits.public;
}

// Create separate limiters for each type of route
const limiters = {
  auth: ratelimit({
    db: rateLimitStore,
    driver: "memory",
    errorMessage:
      "Rate limit exceeded for authentication, please try again later.",
    id: (ctx: Context) => {
      const clientId = getClientIdentifier(ctx);
      const userId = ctx.state?.user?.id || "anonymous";
      return `auth:${clientId}:${userId}`;
    },
    max: rateLimits.auth.max,
    duration: rateLimits.auth.duration,
    disableHeader: false,
    headers: {
      remaining: "X-RateLimit-Remaining",
      reset: "X-RateLimit-Reset",
      total: "X-RateLimit-Limit",
    },
    whitelist: (ctx: Context) =>
      config.server.rateLimitWhitelist?.includes(ctx.ip) || false,
  }),
  api: ratelimit({
    db: rateLimitStore,
    driver: "memory",
    errorMessage: "Rate limit exceeded for API calls, please try again later.",
    id: (ctx: Context) => {
      const clientId = getClientIdentifier(ctx);
      const userId = ctx.state?.user?.id || "anonymous";
      return `api:${clientId}:${userId}`;
    },
    max: rateLimits.api.max,
    duration: rateLimits.api.duration,
    disableHeader: false,
    headers: {
      remaining: "X-RateLimit-Remaining",
      reset: "X-RateLimit-Reset",
      total: "X-RateLimit-Limit",
    },
    whitelist: (ctx: Context) =>
      config.server.rateLimitWhitelist?.includes(ctx.ip) || false,
  }),
  public: ratelimit({
    db: rateLimitStore,
    driver: "memory",
    errorMessage: "Rate limit exceeded, please try again later.",
    id: (ctx: Context) => {
      const clientId = getClientIdentifier(ctx);
      const userId = ctx.state?.user?.id || "anonymous";
      return `public:${clientId}:${userId}`;
    },
    max: rateLimits.public.max,
    duration: rateLimits.public.duration,
    disableHeader: false,
    headers: {
      remaining: "X-RateLimit-Remaining",
      reset: "X-RateLimit-Reset",
      total: "X-RateLimit-Limit",
    },
    whitelist: (ctx: Context) =>
      config.server.rateLimitWhitelist?.includes(ctx.ip) || false,
  }),
};

// Create rate limiter middleware
export const rateLimiter = async (ctx: Context, next: Next) => {
  // Select the appropriate limiter based on the path
  let limiter;
  if (ctx.path.startsWith("/user/token")) {
    limiter = limiters.auth;
  } else if (
    ctx.path.startsWith("/user") ||
    ctx.path.startsWith("/config") ||
    ctx.path.startsWith("/depot")
  ) {
    limiter = limiters.api;
  } else {
    limiter = limiters.public;
  }

  // Debug information before applying rate limit
  const type = ctx.path.startsWith("/user/token")
    ? "auth"
    : ctx.path.startsWith("/user")
      ? "api"
      : "public";
  const clientId = getClientIdentifier(ctx);
  const userId = ctx.state?.user?.id || "anonymous";
  const id = `${type}:${clientId}:${userId}`;
  const currentCount = rateLimitStore.get(id);

  // console.log(`Rate limit debug for ${id}:`, {
  //   path: ctx.path,
  //   clientId,
  //   currentCount: currentCount?.count || 0,
  //   maxAllowed: rateLimits[type].max,
  //   resetIn: currentCount
  //     ? Math.ceil((currentCount.reset - Date.now()) / 1000) + "s"
  //     : "N/A",
  //   type,
  //   headers: {
  //     "x-forwarded-for": ctx.get("x-forwarded-for"),
  //     "x-real-ip": ctx.get("x-real-ip"),
  //     "cf-connecting-ip": ctx.get("cf-connecting-ip"),
  //     "user-agent": ctx.get("user-agent"),
  //   },
  // });

  await limiter(ctx, next);
};
