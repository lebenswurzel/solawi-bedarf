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
import { Id } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { OrderItem } from "../../database/OrderItem";
import { Product } from "../../database/Product";
import { ShipmentItem } from "../../database/ShipmentItem";
import { getUserFromContext } from "../getUserFromContext";

export const deleteProduct = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const product = ctx.request.body as Id;
  const existing = await AppDataSource.getRepository(Product).findOneBy({
    id: product.id || -1,
  });
  if (!existing) {
    ctx.throw(http.not_found, `product id=${product.id} does not exist`);
  }

  // check existing orders
  const order = await AppDataSource.getRepository(OrderItem).findOne({
    where: {
      productId: product.id,
    },
  });
  if (order) {
    ctx.throw(
      http.bad_request,
      `product ${existing.name} id=${existing.id} is part of an order`,
    );
  }

  // check existing shipments
  const shipmentItem = await AppDataSource.getRepository(ShipmentItem).findOne({
    where: {
      productId: product.id,
    },
  });
  if (shipmentItem) {
    ctx.throw(
      http.bad_request,
      `product ${existing.name} id=${existing.id} is part of a shipment`,
    );
  }

  // delete product
  await AppDataSource.getRepository(Product).delete({ id: product.id });

  ctx.status = http.no_content;
};
