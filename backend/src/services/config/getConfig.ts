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
import { http } from "../../consts/http";
import { Depot } from "../../database/Depot";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";
import { AvailableConfig } from "../../../../shared/src/types";
import { getNumericQueryParameter } from "../../util/requestUtil";
import { UserRole } from "../../../../shared/src/enum";

export const getConfig = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const user = await getUserFromContext(ctx);
  const depots = await AppDataSource.getRepository(Depot).find({
    where: { active: true },
  });

  // omit non-public configs for regular users
  let where = {};
  if (user.role == UserRole.USER) {
    where = { public: true };
  }

  let requisitionConfig: RequisitionConfig | null;
  const requestId = getNumericQueryParameter(ctx.request.query, "configId");
  if (requestId < 0) {
    // find any existing config to retain previous behavior
    // ... maybe specify some condition?
    requisitionConfig = await AppDataSource.getRepository(
      RequisitionConfig,
    ).findOne({ where });
  } else {
    requisitionConfig = await AppDataSource.getRepository(
      RequisitionConfig,
    ).findOne({ where: { ...where, id: requestId } });
  }

  if (!requisitionConfig) {
    ctx.throw(http.not_found);
  }

  const availableConfigs: AvailableConfig[] = (
    await AppDataSource.getRepository(RequisitionConfig).find({
      select: ["id", "name", "public"],
      order: {
        validFrom: "ASC",
      },
      where,
    })
  ).map((row) => {
    return {
      id: row.id,
      name: row.name,
      public: row.public,
    };
  });

  ctx.body = {
    depots,
    config: requisitionConfig,
    availableConfigs,
  };
};
