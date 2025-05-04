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
import {
  NewProductCategory,
  OptionalId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { AppDataSource } from "../database/database";
import { Product } from "../database/Product";
import { ProductCategory } from "../database/ProductCategory";

export const copyProductCategories = async (
  fromConfigId: number,
  toConfigId: number,
) => {
  console.log(
    "copying products and categories from " +
      fromConfigId +
      " to " +
      toConfigId,
  );
  const productCategories = await AppDataSource.getRepository(
    ProductCategory,
  ).find({ where: { requisitionConfigId: fromConfigId } });

  await AppDataSource.transaction(async (entityManager) => {
    for (let category of productCategories) {
      const categoryCopy: NewProductCategory = {
        name: category.name,
        active: category.active,
        requisitionConfigId: toConfigId,
        typ: category.typ,
      };
      const savedCategory = await entityManager.save(
        ProductCategory,
        categoryCopy,
      );

      let productCount = 0;
      for (let product of await entityManager.find(Product, {
        where: { productCategoryId: category.id },
      })) {
        const productCopy = {
          ...product,
          id: undefined,
          productCategoryId: savedCategory.id,
        };
        entityManager.save(Product, productCopy);
        productCount++;
      }
      console.log(
        `copied ProductCategory ${category.name} with ${productCount} products`,
      );
    }
  });
};
