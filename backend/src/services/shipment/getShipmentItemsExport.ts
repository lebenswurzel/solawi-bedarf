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
import { UserRole, Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { ShipmentItemExportRow } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { ShipmentItem } from "../../database/ShipmentItem";
import { getConfigIdFromQuery } from "../../util/requestUtil";
import { getUserFromContext } from "../getUserFromContext";

type RawShipmentItemExportRow = {
  depotName: string;
  productName: string;
  totalShipedQuantity: string | number;
  unit: Unit;
  multiplicator: string | number;
  validFrom: Date | string;
  season: string;
};

export const getShipmentItemsExport = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const configId = getConfigIdFromQuery(ctx);

  const rows = await AppDataSource.getRepository(ShipmentItem)
    .createQueryBuilder("si")
    .innerJoin("si.shipment", "s")
    .innerJoin("si.depot", "d")
    .innerJoin("si.product", "p")
    .innerJoin("s.requisitionConfig", "r")
    .select("d.name", "depotName")
    .addSelect("p.name", "productName")
    .addSelect("si.totalShipedQuantity", "totalShipedQuantity")
    .addSelect("si.unit", "unit")
    .addSelect("si.multiplicator", "multiplicator")
    .addSelect("s.validFrom", "validFrom")
    .addSelect("r.name", "season")
    .where("s.requisitionConfigId = :configId", { configId })
    .orderBy("s.validFrom", "ASC")
    .addOrderBy("d.name", "ASC")
    .addOrderBy("p.name", "ASC")
    .getRawMany<RawShipmentItemExportRow>();

  const items: ShipmentItemExportRow[] = rows.map((row) => ({
    depotName: row.depotName,
    productName: row.productName,
    totalShipedQuantity: Number(row.totalShipedQuantity),
    unit: row.unit,
    multiplicator: Number(row.multiplicator),
    validFrom: new Date(row.validFrom).toISOString(),
    season: row.season,
  }));

  ctx.body = { items };
};
