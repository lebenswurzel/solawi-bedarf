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
import { ProductCategory } from "../../database/ProductCategory";
import { getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Id } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { Product } from "../../database/Product";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { ShipmentItem } from "../../database/ShipmentItem";

export const deleteProductCategory = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const productCategory = ctx.request.body as Id;
  const existing = await AppDataSource.getRepository(ProductCategory).findOneBy(
    { id: productCategory.id || -1 },
  );
  if (!existing) {
    ctx.throw(
      http.bad_request,
      `product category id=${productCategory.id} does not exist`,
    );
  }

  const products = await AppDataSource.getRepository(Product).find({
    where: {
      productCategoryId: productCategory.id,
    },
  });

  // check existing orders
  for (let product of products) {
    const order = await AppDataSource.getRepository(OrderItem).findOne({
      where: {
        productId: product.id,
      },
    });
    if (order) {
      ctx.throw(
        http.bad_request,
        `product ${product.name} id=${product.id} is part of an order`,
      );
    }
  }

  // check existing shipments
  for (let product of products) {
    const order = await AppDataSource.getRepository(ShipmentItem).findOne({
      where: {
        productId: product.id,
      },
    });
    if (order) {
      ctx.throw(
        http.bad_request,
        `product ${product.name} id=${product.id} is part of a shipment`,
      );
    }
  }

  // delete products
  await AppDataSource.getRepository(Product).delete({
    productCategoryId: productCategory.id,
  });

  // delete product category
  await AppDataSource.getRepository(ProductCategory).delete({
    id: productCategory.id,
  });

  ctx.status = http.no_content;
};
