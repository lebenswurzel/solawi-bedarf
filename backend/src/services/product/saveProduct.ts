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
import { Product } from "../../database/Product";
import { UserRole } from "../../../../shared/src/enum";

export const saveProduct = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const product = ctx.request.body as Product;
  if (product.id) {
    const existing = await AppDataSource.getRepository(Product).findOneBy({
      id: product.id,
    });
    if (!existing) {
      ctx.throw(http.bad_request);
    }
    ctx.status = http.ok;
  } else {
    ctx.status = http.created;
  }

  // prevent product with same name in the product category
  const sameName = await AppDataSource.getRepository(Product).findOneBy({
    name: product.name,
    productCategoryId: product.productCategoryId,
  });

  if (sameName && sameName.id != product.id) {
    ctx.throw(
      http.bad_request,
      "product with same name exists in the product category",
    );
  }

  ctx.body = await AppDataSource.getRepository(Product).save(product);
};
