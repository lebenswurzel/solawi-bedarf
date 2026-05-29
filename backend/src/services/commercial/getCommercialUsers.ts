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
import Koa from "koa";
import Router from "koa-router";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { User } from "../../database/User";
import { getUserFromContext } from "../getUserFromContext";

export const getCommercialUsers = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }

  const users = await AppDataSource.getRepository(User).find({
    where: { role: UserRole.COMMERCIAL, active: true, deleted: false },
    relations: { commercialProfile: true },
    order: { name: "ASC" },
  });

  ctx.body = {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
      commercialProfile: user.commercialProfile
        ? {
            companyName: user.commercialProfile.companyName,
            street: user.commercialProfile.street,
            postalcode: user.commercialProfile.postalcode,
            city: user.commercialProfile.city,
          }
        : null,
    })),
  };
};
