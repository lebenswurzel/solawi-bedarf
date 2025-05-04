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
import { FindManyOptions } from "typeorm";
import { User } from "../../database/User";
import { AppDataSource } from "../../database/database";
import { getTokenValidity, getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { GetUserResponse } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { Applicant } from "../../database/Applicant";

export const getUser = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { id, role } = await getUserFromContext(ctx);
  const tokenValidUntil = getTokenValidity(ctx);
  const findOptions: FindManyOptions<User> =
    role == UserRole.ADMIN
      ? {
          order: { name: "ASC" },
          select: {
            name: true,
            id: true,
            role: true,
            active: true,
            orders: {
              updatedAt: true,
              requisitionConfigId: true,
              validFrom: true,
              orderItems: true,
            },
          },
          relations: {
            orders: {
              orderItems: true,
              depot: true,
            },
          },
        }
      : {
          order: { name: "ASC" },
          select: { name: true, id: true, role: true, active: true },
          where: { id },
        };
  const users = await AppDataSource.getRepository(User).find(findOptions);

  ctx.body = {
    userId: id,
    users: await Promise.all(
      users.map(async (u) => {
        const hasApplicant =
          (await AppDataSource.getRepository(Applicant).count({
            where: {
              userId: u.id,
            },
          })) > 0;
        return {
          name: u.name,
          id: u.id,
          role: u.role,
          active: u.active,
          orders: (u.orders ?? []).map((o) => ({
            updatedAt: o.updatedAt,
            configId: o.requisitionConfigId,
            validFrom: o.validFrom,
            hasItems: o.orderItems?.length > 0,
            depotId: o.depotId,
            depotName: o.depot?.name,
          })),
          emailEnabled: hasApplicant,
        };
      }),
    ),
    tokenValidUntil,
  } as GetUserResponse;
};
