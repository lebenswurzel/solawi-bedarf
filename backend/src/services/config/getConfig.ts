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
import {
  AvailableConfig,
  ConfigResponse,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { getNumericQueryParameter } from "../../util/requestUtil";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { User } from "../../database/User";
import { Order } from "../../database/Order";

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

  let requisitionConfig: RequisitionConfig | null = null;
  const requestId = getNumericQueryParameter(ctx.request.query, "configId");
  if (requestId < 0) {
    // select a default season based on the current user
    // * Users with an order in the current season: current season
    // * Users without an order in the current season: the next season
    const configs = await AppDataSource.getRepository(RequisitionConfig).find({
      where,
      order: {
        validFrom: "ASC",
      },
    });

    if (configs.length == 1) {
      requisitionConfig = configs[0];
    } else if (configs.length > 1) {
      requisitionConfig = await getFirstConfigWithActiveOrderOrLast(
        user.id,
        configs,
      );
    }
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

  // show hint, if the currently selected season is not the same as the newest season
  const showSeasonSelectorHint =
    availableConfigs.length > 1 &&
    availableConfigs[availableConfigs.length - 1].id != requisitionConfig.id;

  ctx.body = {
    depots,
    config: requisitionConfig,
    availableConfigs,
    showSeasonSelectorHint,
  } satisfies ConfigResponse;
};

const getFirstConfigWithActiveOrderOrLast = async (
  userId: number,
  configs: RequisitionConfig[],
): Promise<RequisitionConfig | null> => {
  for (let config of configs) {
    const foundOrders = await AppDataSource.getRepository(Order).find({
      where: { userId, requisitionConfigId: config.id },
    });

    if (foundOrders.length > 0) {
      return config;
    }
  }
  // if no order exists, return the last avaiable config
  return configs[configs.length - 1];
};
