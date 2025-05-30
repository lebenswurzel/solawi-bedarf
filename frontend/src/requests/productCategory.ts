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
  Id,
  NewProductCategory,
  OptionalId,
  ProductCategoryWithProducts,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getProductCategory = async (
  configId: number,
): Promise<ProductCategoryWithProducts[]> => {
  const response = await fetch(getUrl(`/productCategory?configId=${configId}`));

  await verifyResponse(response);

  return (await response.json()).productCategories;
};

export const saveProductCategory = async (
  productCategory: Required<NewProductCategory> & OptionalId,
) => {
  const response = await fetch(getUrl("/productCategory"), {
    method: "POST",
    body: JSON.stringify(productCategory),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const deleteProductCategory = async (productCategoryId: Id) => {
  const response = await fetch(getUrl("/productCategory"), {
    method: "DELETE",
    body: JSON.stringify(productCategoryId),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};
