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
import { calculateDeliveries } from "./order/orderUtil";
import {
  DeliveredByProductIdDepotId,
  Depot,
  Msrp,
  OrderItem,
  Product,
  ProductId,
  ProductsById,
} from "./types";
import { countCalendarMonths, getSameOrNextThursday } from "./util/dateHelper";

const getYearlyBaseMsrp = (orderItem: OrderItem, product: Product) => {
  if (product) {
    const conversion = product.unit == Unit.PIECE ? 100 : 100000; // convert ct/kg & ct/pcs too €/g & €/pcs
    return (
      ((product.frequency || 1) * product.msrp * orderItem.value) / conversion
    );
  }
  return 0;
};

const adjustMsrp = (
  baseMsrp: number,
  category: UserCategory,
  months: number
) => {
  if (baseMsrp > 0) {
    return (
      appConfig.msrp[category].absolute +
      Math.ceil((appConfig.msrp[category].relative * baseMsrp) / months)
    );
  }
  return 0;
};

export const getMsrp = (
  category: UserCategory,
  orderItems: OrderItem[],
  productById: ProductsById,
  months: number,
  productMsrpWeights?: { [key: ProductId]: number }
): Msrp => {
  const baseMsrp = orderItems.reduce(
    (acc, orderItem) =>
      acc +
      getYearlyBaseMsrp(orderItem, productById[orderItem.productId]) *
        (productMsrpWeights ? productMsrpWeights[orderItem.productId] : 1),
    0
  );
  const selfgrownMsrp = orderItems.reduce(
    (acc, orderItem) =>
      acc +
      (productById[orderItem.productId]?.productCategoryType ==
      ProductCategoryType.SELFGROWN
        ? getYearlyBaseMsrp(orderItem, productById[orderItem.productId]) *
          (productMsrpWeights ? productMsrpWeights[orderItem.productId] : 1)
        : 0),
    0
  );

  const adjustedMonthlyTotal = adjustMsrp(baseMsrp, category, months);
  const adjustedMonthlySelfgrown = adjustMsrp(selfgrownMsrp, category, months);
  return {
    monthly: {
      total: adjustedMonthlyTotal,
      selfgrown: adjustedMonthlySelfgrown,
      cooperation: adjustedMonthlyTotal - adjustedMonthlySelfgrown,
    },
    yearly: {
      total: adjustedMonthlyTotal * months,
      selfgrown: adjustedMonthlySelfgrown * months,
      cooperation: (adjustedMonthlyTotal - adjustedMonthlySelfgrown) * months,
    },
    months,
  };
};

export const calculateMsrpWeights = (
  productsById: ProductsById,
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId,
  depots: Depot[]
): { [key: ProductId]: number } => {
  return Object.fromEntries(
    Object.values(productsById)
      .map((product) => [
        product.id,
        1 -
          calculateDeliveries(product, deliveredByProductIdDepotId, depots)
            .percentage /
            100,
      ])
      .map(([key, value]) => [key, value > 0 ? value : 0])
  );
};

export const calculateOrderValidMonths = (
  orderValidFrom?: Date | null,
  seasonValidTo?: Date,
  timezone?: string
): number => {
  if (orderValidFrom && seasonValidTo) {
    let firstShipment = getSameOrNextThursday(orderValidFrom);
    return Math.min(
      countCalendarMonths(firstShipment, seasonValidTo, timezone),
      12
    );
  }
  return 12;
};
