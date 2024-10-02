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
import { getNumericQueryParameter } from "../../util/requestUtil";
import { getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";

export const getProductCategory = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  await getUserFromContext(ctx);
  const configId = getNumericQueryParameter(ctx.request.query, "configId");

  const productCategories = await AppDataSource.getRepository(
    ProductCategory,
  ).find({
    relations: { products: true },
    order: { name: "ASC", products: { name: "ASC" } },
    where: { requisitionConfigId: configId },
  });
  ctx.body = { productCategories };
};
