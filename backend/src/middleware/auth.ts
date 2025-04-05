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
import { Context, Next } from "koa";
import passport from "./passport";
import { UserRole } from "../../../shared/src/enum";
import { http } from "../consts/http";
import { config } from "../config";
import { Token } from "../database/Token";
import { AppDataSource } from "../database/database";
import { randomUUID } from "crypto";
import { createJwt } from "../security";
import { calculateExpirationTimeStamp } from "../services/user/login";
import { invalidateTokenForUser } from "../token";

// Initialize Passport middleware
export const initializeAuth = () => {
  return async (ctx: Context, next: Next) => {
    await passport.initialize()(ctx, next);
  };
};

// Authentication middleware
export const authenticate = () => {
  return async (ctx: Context, next: Next) => {
    await passport.authenticate("jwt", { session: false })(ctx, async () => {
      if (!ctx.state.user) {
        ctx.throw(http.unauthorized);
      }
      await next();
    });
  };
};

// Role-based authorization middleware
export const authorize = (roles: UserRole[]) => {
  return async (ctx: Context, next: Next) => {
    if (!ctx.state.user) {
      ctx.throw(http.unauthorized);
    }

    if (!roles.includes(ctx.state.user.role)) {
      ctx.throw(http.forbidden);
    }

    await next();
  };
};

// Helper function to create a new token
async function createToken(
  user: Express.User,
  untilMidnight: boolean,
): Promise<string> {
  await AppDataSource.getRepository(Token).delete({
    user: { id: user.id },
  });

  const token = new Token();
  token.jti = randomUUID();
  token.iat = new Date();
  const expirationTime = calculateExpirationTimeStamp(
    token.iat,
    config.jwt.expirationTimeInMs * (user.role === UserRole.USER ? 3 : 1),
    untilMidnight,
  );
  token.exp = new Date(expirationTime);
  token.user = user as any;
  token.active = true;

  await invalidateTokenForUser(user.id);
  await AppDataSource.getRepository(Token).save(token);

  return createJwt(token);
}

// Helper function to get token expiration
function getTokenExpiration(untilMidnight: boolean): Date {
  const now = new Date();
  const expirationTime = calculateExpirationTimeStamp(
    now,
    config.jwt.expirationTimeInMs,
    untilMidnight,
  );
  return new Date(expirationTime);
}

// Login endpoint middleware
export const login = () => {
  return async (ctx: Context, next: Next) => {
    await passport.authenticate(
      "local",
      async (err: any, user: any, info: any) => {
        if (err) {
          ctx.throw(http.bad_request, err);
        }

        if (!user) {
          ctx.throw(
            http.unauthorized,
            info?.message || "Authentication failed",
          );
        }

        // Create JWT token
        const token = await createToken(
          user,
          ctx.query.untilMidnight === "true",
        );

        // Set cookie
        ctx.cookies.set("token", token, {
          httpOnly: true,
          secure: config.jwt.cookieSecure,
          sameSite: "strict",
          expires: getTokenExpiration(ctx.query.untilMidnight === "true"),
        });

        ctx.status = http.no_content;
      },
    )(ctx, next);
  };
};

// Logout endpoint middleware
export const logout = () => {
  return async (ctx: Context, next: Next) => {
    if (ctx.state.user) {
      await invalidateTokenForUser(ctx.state.user.id);
    }
    ctx.cookies.set("token", "");
    ctx.status = http.no_content;
    await next();
  };
};
