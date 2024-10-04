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
import { http } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Depot } from "../../database/Depot";
import { Order } from "../../database/Order";
import { UserRole } from "../../../../shared/src/enum";
import { DepotInfo } from "./depotTypes";

export const saveDepot = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestDepot = ctx.request.body as DepotInfo;

  if (requestDepot.id) {
    const depot = await AppDataSource.getRepository(Depot).findOneBy({
      id: requestDepot.id,
    });
    if (!depot) {
      ctx.throw(http.bad_request, `depot id=${requestDepot.id} does not exist`);
    } else {
      depot.name = requestDepot.name;
      depot.address = requestDepot.address;
      depot.openingHours = requestDepot.openingHours;
      depot.capacity = requestDepot.capacity;
      if (requestDepot.comment) {
        depot.comment = requestDepot.comment;
      }
      if (!requestDepot.active && depot.active) {
        const count = await AppDataSource.getRepository(Order).count({
          where: [{ depotId: depot.id }, { alternateDepotId: depot.id }],
        });
        if (count > 0) {
          ctx.throw(
            http.bad_request,
            "cannot disable because depot has active orders",
          );
        }
      }
      depot.active = requestDepot.active;
      await AppDataSource.getRepository(Depot).save(depot);
      ctx.status = http.no_content;
    }
  } else {
    // new depot
    const depot = new Depot();
    depot.name = requestDepot.name;
    depot.address = requestDepot.address;
    depot.openingHours = requestDepot.openingHours;
    depot.capacity = requestDepot.capacity;
    depot.active = requestDepot.active;
    depot.rank = (await getMaxRank()) + 1;
    if (requestDepot.comment) {
      depot.comment = requestDepot.comment;
    }
    await AppDataSource.getRepository(Depot).save(depot);
    ctx.status = http.created;
  }
};

const getMaxRank = async (): Promise<number> => {
  const result = await AppDataSource.createQueryBuilder(Depot, "depot")
    .select("MAX(depot.rank)", "maxRank")
    .getRawOne();
  return result?.maxRank ?? 0;
};
