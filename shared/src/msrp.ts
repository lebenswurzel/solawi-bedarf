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
import { appConfig } from "./config";
import { ProductCategoryType, Unit, UserCategory } from "./enum";
import { Msrp, OrderItem, Product, ProductsById } from "./types";

export const getBaseMsrp = (orderItem: OrderItem, product: Product) => {
  if (product) {
    const conversion = product.unit == Unit.PIECE ? 100 : 100000; // convert ct/kg & ct/pcs too €/g & €/pcs
    return (
      ((product.frequency || 1) * product.msrp * orderItem.value) / conversion
    );
  }
  return 0;
};

export const adjustMsrp = (baseMsrp: number, category: UserCategory) => {
  if (baseMsrp > 0) {
    return (
      appConfig.msrp[category].absolute +
      Math.ceil((appConfig.msrp[category].relative * baseMsrp) / 12)
    );
  }
  return 0;
};

export const getMsrp = (
  category: UserCategory,
  orderItems: OrderItem[],
  productById: ProductsById
): Msrp => {
  const baseMsrp = orderItems.reduce(
    (acc, orderItem) =>
      acc + getBaseMsrp(orderItem, productById[orderItem.productId]),
    0
  );
  const selfgrownMsrp = orderItems.reduce(
    (acc, orderItem) =>
      acc +
      (productById[orderItem.productId]?.productCategoryType ==
      ProductCategoryType.SELFGROWN
        ? getBaseMsrp(orderItem, productById[orderItem.productId])
        : 0),
    0
  );
  const adjustedTotal = adjustMsrp(baseMsrp, category);
  const adjustedSelfgrown = adjustMsrp(selfgrownMsrp, category);
  return {
    total: adjustedTotal,
    selfgrown: adjustedSelfgrown,
    cooperation: adjustedTotal - adjustedSelfgrown,
  };
};
