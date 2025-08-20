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
  Order,
  OrderItem,
  Product,
  ProductId,
  ProductsById,
  RequisitionConfig,
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
    return (appConfig.msrp[category].relative * baseMsrp) / months;
  }
  return 0;
};

export const getOrderItemAdjustedMonthlyMsrp = (
  category: UserCategory,
  orderItem: OrderItem,
  productById: ProductsById,
  months: number,
  productMsrpWeights?: { [key: ProductId]: number }
): number => {
  const baseMsrp =
    getYearlyBaseMsrp(orderItem, productById[orderItem.productId]) *
    (productMsrpWeights ? productMsrpWeights[orderItem.productId] : 1);
  return adjustMsrp(baseMsrp, category, months);
};

export const getMsrp = (
  category: UserCategory,
  orderItems: OrderItem[],
  productsById: ProductsById,
  months: number,
  productMsrpWeights?: { [key: ProductId]: number }
): Msrp => {
  const adjustedMonthlyTotal = Math.ceil(
    orderItems.reduce(
      (acc, orderItem) =>
        acc +
        getOrderItemAdjustedMonthlyMsrp(
          category,
          orderItem,
          productsById,
          months,
          productMsrpWeights
        ),
      0
    )
  );
  const adjustedMonthlySelfgrown = Math.ceil(
    orderItems
      .filter(
        (oi) =>
          productsById[oi.productId].productCategoryType ==
          ProductCategoryType.SELFGROWN
      )
      .reduce(
        (acc, orderItem) =>
          acc +
          getOrderItemAdjustedMonthlyMsrp(
            category,
            orderItem,
            productsById,
            months,
            productMsrpWeights
          ),
        0
      )
  );

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

export const calculateEffectiveMsrp = (
  orders: {
    order: Order;
    deliveredByProductIdDepotId: DeliveredByProductIdDepotId;
  }[],
  productsById: ProductsById,
  depots: Depot[],
  config: RequisitionConfig,
  timezone: string
): {
  effectiveMsrp: { [key: ProductId]: number };
  effectiveMsrpSum: number;
} => {
  type ProductKey = string;
  interface OrderMsrpValues {
    order: Order;
    validFrom: Date | null;
    msrp: Msrp;
    productMsrpWeights: { [key: ProductId]: number };
    productMsrps: {
      [key: string]: number;
    };
  }

  const productKey = (oi: OrderItem, productsById: ProductsById): ProductKey =>
    `${productsById[oi.productId].name}_${oi.productId}`;

  const orderMsrpValues: OrderMsrpValues[] = orders.map((o) => {
    const validMonths = calculateOrderValidMonths(
      o.order.validFrom,
      config.validTo,
      timezone
    );

    const productMsrpWeights = calculateMsrpWeights(
      productsById,
      o.deliveredByProductIdDepotId,
      depots
    );

    return {
      order: o.order,
      validFrom: o.order.validFrom,
      msrp: getMsrp(
        o.order.category,
        o.order.orderItems,
        productsById,
        validMonths,
        productMsrpWeights
      ),
      productMsrpWeights,
      productMsrps: o.order.orderItems.reduce(
        (acc, oi) => {
          acc[productKey(oi, productsById)] = getOrderItemAdjustedMonthlyMsrp(
            o.order.category,
            oi,
            productsById,
            validMonths,
            productMsrpWeights
          );
          return acc;
        },
        {} as { [key: string]: number }
      ),
    };
  });

  const aggregateEffectiveMsrp = (
    laterOrder: OrderMsrpValues,
    earlierOrder: OrderMsrpValues
  ): { [key: ProductKey]: number } => {
    console.log(laterOrder.msrp.months, laterOrder.order.orderItems);
    console.log(earlierOrder.msrp.months, earlierOrder.order.orderItems);
    const result: { [key: ProductKey]: number } = {};
    for (const orderItem of laterOrder.order.orderItems) {
      const earlierOrderItem = earlierOrder.order.orderItems.find(
        (oi) => oi.productId === orderItem.productId
      );
      const pk = productKey(orderItem, productsById);
      let offset = 0;
      if (earlierOrderItem) {
        // calculate over/under price paid
        offset =
          earlierOrder.productMsrps[pk] *
          (earlierOrder.msrp.months *
            laterOrder.productMsrpWeights[orderItem.productId] -
            laterOrder.msrp.months);
        // console.log(
        //   pk,
        //   offset,
        //   earlierOrder.productMsrps[pk],
        //   earlierOrder.msrp.months,
        //   earlierOrder.productMsrpWeights[orderItem.productId],
        //   laterOrder.msrp.months,
        //   laterOrder.productMsrpWeights[orderItem.productId]
        // );
      }
      result[pk] =
        laterOrder.productMsrps[pk] - offset / laterOrder.msrp.months;
      console.log(pk, result[pk]);
    }
    return result;
  };

  const effectiveMsrp = aggregateEffectiveMsrp(
    orderMsrpValues[1],
    orderMsrpValues[0]
  );
  const effectiveMsrpSum: number = Object.values(effectiveMsrp).reduce(
    (acc, value) => acc + value,
    0
  );
  return {
    effectiveMsrp,
    effectiveMsrpSum,
  };
};
