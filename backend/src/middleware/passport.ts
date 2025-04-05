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
import passport from "koa-passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { comparePassword } from "../security";
import { config } from "../config";
import { AppDataSource } from "../database/database";
import { User } from "../database/User";
import { verifyLDAP } from "../services/ldap/ldap";
import { UserRole } from "../../../shared/src/enum";

type DoneFunction = (
  error: any,
  user?: any,
  options?: { message: string },
) => void;

// Define our custom User type for Passport
interface PassportUser {
  id: number;
  name: string;
  active: boolean;
  role: UserRole;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends PassportUser {}
  }
}

// Local Strategy (username/password)
passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: false,
    },
    async (username: string, password: string, done: DoneFunction) => {
      try {
        const user = await AppDataSource.getRepository(User).findOneBy({
          name: username,
        });

        // If LDAP is enabled, try LDAP authentication first
        if (config.ldap.enabled) {
          const userRole = await verifyLDAP(username, password);
          if (userRole) {
            if (!user) {
              // Create new user if they don't exist
              const newUser = new User();
              newUser.name = username;
              newUser.hash = "ldap";
              newUser.active = true;
              newUser.role = userRole;
              await AppDataSource.getRepository(User).save(newUser);
              return done(null, newUser);
            }
            // Update existing user's role
            user.role = userRole;
            await AppDataSource.getRepository(User).save(user);
            return done(null, user);
          }
        }

        // Fall back to local authentication if LDAP is disabled or fails
        if (!user || !(await comparePassword(password, user.hash))) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // if (!user.active) {
        //   return done(null, false, { message: "User account is not active" });
        // }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (ctx) => {
          let token = null;
          if (ctx && ctx.cookies) {
            token = ctx.cookies.get("token");
          }
          return token;
        },
      ]),
      secretOrKey: config.jwt.secret,
    },
    async (payload: any, done: DoneFunction) => {
      try {
        const user = await AppDataSource.getRepository(User)
          .createQueryBuilder("user")
          .innerJoin("user.token", "token")
          .where("token.jti = :jti", { jti: payload.jti })
          .andWhere("token.active = :active", { active: true })
          .getOne();

        if (!user) {
          return done(null, false, { message: "Invalid token" });
        }

        if (!user.active) {
          return done(null, false, { message: "User account is not active" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// Serialize user for the session
passport.serializeUser((user: Express.User, done: DoneFunction) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done: DoneFunction) => {
  try {
    const user = await AppDataSource.getRepository(User).findOneBy({ id });
    if (!user) {
      return done(new Error("User not found"));
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
