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
import auth, { BasicAuthResult } from "basic-auth";
import { comparePassword, createJwt, hashPassword } from "../../security";
import { config } from "../../config";
import { http as httpCodes } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Token } from "../../database/Token";
import { AppDataSource } from "../../database/database";
import { User } from "../../database/User";
import { randomUUID } from "node:crypto";
import { getUserFromContext } from "../getUserFromContext";
import { invalidateTokenForUser } from "../../token";
import http from "http";
import { verifyLDAP } from "../ldap/ldap";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const login = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const basicAuthUser = auth(ctx.req);
  if (basicAuthUser) {
    const untilMidnight = ctx.request.query?.untilMidnight === "true";
    const token = config.ldap.enabled
      ? await getTokenWithLDAP(basicAuthUser, untilMidnight)
      : await getToken(basicAuthUser, untilMidnight);
    if (token) {
      ctx.cookies.set("token", createJwt(token), {
        expires: token.exp,
        httpOnly: true,
        secure: config.jwt.cookieSecure,
        sameSite: "strict",
      });
      ctx.status = httpCodes.no_content;
    }
  } else {
    ctx.status = httpCodes.unauthorized;
  }
};

export const logout = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { id } = await getUserFromContext(ctx);

  await invalidateTokenForUser(id);

  ctx.cookies.set("token", "");
  ctx.status = httpCodes.no_content;
};

const getTokenWithLDAP = async (
  basicAuthUser: BasicAuthResult,
  untilMidnight?: boolean,
): Promise<Token | null> => {
  const userRole = await verifyLDAP(basicAuthUser.name, basicAuthUser.pass);

  let user = await AppDataSource.getRepository(User).findOneBy({
    name: basicAuthUser.name,
  });

  if (userRole) {
    if (!user) {
      user = new User(basicAuthUser.name, "ldap", userRole, true);
    } else {
      user.role = userRole;
    }
    await AppDataSource.getRepository(User).save(user);
    return generateToken(user, untilMidnight);
  }

  return null;
};

const getToken = async (
  basicAuthUser: BasicAuthResult,
  untilMidnight?: boolean,
): Promise<Token | null> => {
  const user = await AppDataSource.getRepository(User).findOneBy({
    name: basicAuthUser.name,
  });

  if (user && user.hash.startsWith("$2y$")) {
    const { verify } = await verifyOldHash(basicAuthUser.pass, user.hash);
    if (verify) {
      user.hash = await hashPassword(basicAuthUser.pass);
      await AppDataSource.getRepository(User).save(user);
    }
  }

  if (user && (await comparePassword(basicAuthUser.pass, user.hash))) {
    return await generateToken(user, untilMidnight);
  }
  return null;
};

export const calculateExpirationTimeStamp = (
  issuedAtTime: Date,
  expirationTimeInMs: number,
  untilMidnight?: boolean,
): number => {
  untilMidnight = untilMidnight === true;

  if (untilMidnight) {
    const nextMidnight = toZonedTime(new Date(issuedAtTime), config.timezone);
    nextMidnight.setHours(23, 59, 59, 0);
    const utcDate = fromZonedTime(nextMidnight, config.timezone);
    return utcDate.getTime();
  }
  return issuedAtTime.getTime() + expirationTimeInMs;
};

const generateToken = async (user: User, untilMidnight?: boolean) => {
  await AppDataSource.getRepository(Token).delete({
    user: { id: user.id },
  });
  const token = new Token();
  token.jti = randomUUID();
  token.iat = new Date();
  const expirationTime = calculateExpirationTimeStamp(
    token.iat,
    config.jwt.expirationTimeInMs * (user.role == UserRole.USER ? 3 : 1),
    untilMidnight,
  );
  token.exp = new Date(expirationTime);
  token.user = user;
  token.active = true;
  await invalidateTokenForUser(user.id);
  await AppDataSource.getRepository(Token).save(token);
  return token;
};

const verifyOldHash = (password: string, hash: string) =>
  new Promise<{ verify: boolean }>((resolve, reject) => {
    const requestData = JSON.stringify({ password, hash });

    const options = {
      hostname: config.php.url,
      port: config.php.port,
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestData),
      },
    };

    const req = http.request(options, function (res) {
      console.log("STATUS:", res.statusCode);
      console.log("HEADERS:", JSON.stringify(res.headers));

      let responseData = "";

      res.setEncoding("utf8");

      res.on("data", function (chunk) {
        responseData += chunk;
      });

      res.on("end", function () {
        const jsonResponse = JSON.parse(responseData);
        resolve(jsonResponse);
      });
    });

    req.on("error", function (e) {
      reject(e);
    });

    req.write(requestData);
    req.end();
  });
