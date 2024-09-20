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
import { getUserFromContext } from "../getUserFromContext";
import { http } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { UserRole } from "../../../../shared/src/enum";
import { UpdateDepot } from "../../../../shared/src/types";
import { AppDataSource } from "../../database/database";
import { Depot } from "../../database/Depot";

export const updateDepot = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const updateRequest = ctx.request.body as UpdateDepot;
  const depot = await AppDataSource.getRepository(Depot).findOneBy({
    id: updateRequest.id,
  });
  if (!depot) {
    ctx.throw(http.bad_request);
  }

  if (updateRequest.rankDown || updateRequest.rankUp) {
    const newRank = depot.rank + (updateRequest.rankDown ? -1 : 1);
    const swappedDepot = await AppDataSource.getRepository(Depot).findOneBy({
      rank: newRank,
    });
    if (!swappedDepot) {
      ctx.throw(http.bad_request);
    }
    await AppDataSource.transaction(async (entityManager) => {
      await entityManager.update(Depot, depot.id, { rank: newRank });
      await entityManager.update(Depot, swappedDepot.id, { rank: depot.rank });
    });
    ctx.status = http.ok;
  }
};
