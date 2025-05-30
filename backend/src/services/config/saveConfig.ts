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
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { ExistingConfig } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { RequisitionConfig } from "../../database/RequisitionConfig";

export const saveConfig = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestConfig = ctx.request.body as ExistingConfig;
  let config = await AppDataSource.getRepository(RequisitionConfig).findOneBy({
    id: requestConfig.id, // prevent an undefined id as this would return the first config from the db
  });
  if (!config) {
    ctx.throw(
      http.bad_request,
      `config with id=${requestConfig.id} does not exist`,
    );
  }

  if (requestConfig.name) {
    config.name = requestConfig.name;
  }
  config.startBiddingRound = requestConfig.startBiddingRound;
  config.endBiddingRound = requestConfig.endBiddingRound;
  config.startOrder = requestConfig.startOrder;
  config.budget = requestConfig.budget;
  config.validFrom = requestConfig.validFrom;
  config.validTo = requestConfig.validTo;
  config.public = requestConfig.public;
  await AppDataSource.getRepository(RequisitionConfig).save(config);

  ctx.status = http.no_content;
};
