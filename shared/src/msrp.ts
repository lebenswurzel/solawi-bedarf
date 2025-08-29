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
  OrderId,
  OrderItem,
  Product,
  ProductId,
  ProductsById,
  SavedOrder,
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
  contribution: UserCategory,
  months: number
) => {
  if (baseMsrp > 0) {
    return (appConfig.msrp[contribution].relative * baseMsrp) / months;
  }
  return 0;
};

export const getOrderItemAdjustedMonthlyMsrp = (
  contribution: UserCategory,
  orderItem: OrderItem,
  productById: ProductsById,
  months: number,
  productMsrpWeights?: { [key: ProductId]: number }
): number => {
  const baseMsrp =
    getYearlyBaseMsrp(orderItem, productById[orderItem.productId]) *
    (productMsrpWeights ? productMsrpWeights[orderItem.productId] : 1);
  return adjustMsrp(baseMsrp, contribution, months);
};

export const getMsrp = (
  contribution: UserCategory,
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
          contribution,
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
            contribution,
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
      selfgrownCompensation: undefined,
    },
    yearly: {
      total: adjustedMonthlyTotal * months,
      selfgrown: adjustedMonthlySelfgrown * months,
      cooperation: (adjustedMonthlyTotal - adjustedMonthlySelfgrown) * months,
      selfgrownCompensation: undefined,
    },
    months,
    contribution,
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
    let firstShipment = getSameOrNextThursday(orderValidFrom, timezone);
    return Math.min(
      countCalendarMonths(firstShipment, seasonValidTo, timezone),
      12
    );
  }
  return 12;
};

/**
 * Calculate the selfgrown compensation for a modified order and adapt the msrp accordingly
 * @param currentMsrp
 * @param modifiedMsrp
 * @returns the adapted msrp
 */
const adaptSelfgrownCompensation = (
  currentMsrp: Msrp,
  modifiedMsrp: Msrp
): Msrp => {
  if (modifiedMsrp.monthly.selfgrown < currentMsrp.monthly.selfgrown) {
    const compensation =
      currentMsrp.monthly.selfgrown - modifiedMsrp.monthly.selfgrown;
    return {
      monthly: {
        total: modifiedMsrp.monthly.total + compensation,
        selfgrown: modifiedMsrp.monthly.selfgrown,
        cooperation: modifiedMsrp.monthly.cooperation,
        selfgrownCompensation: compensation,
      },
      yearly: {
        total:
          (modifiedMsrp.monthly.total + compensation) * modifiedMsrp.months,
        selfgrown: modifiedMsrp.monthly.selfgrown * modifiedMsrp.months,
        cooperation: modifiedMsrp.monthly.cooperation * modifiedMsrp.months,
        selfgrownCompensation: compensation * currentMsrp.months,
      },
      months: modifiedMsrp.months,
      contribution: modifiedMsrp.contribution,
    };
  }
  return currentMsrp;
};

export const calculateEffectiveMsrp = (
  orders: { laterOrder: SavedOrder; earlierOrder: SavedOrder },
  msrpByOrderId: { [key: OrderId]: Msrp },
  productMsrpWeightsByOrderId: { [key: OrderId]: { [key: ProductId]: number } },
  productsById: ProductsById
): Msrp => {
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

  const orderMsrpValues = (o: SavedOrder) => {
    return {
      order: o,
      validFrom: o.validFrom,
      msrp: msrpByOrderId[o.id],
      productMsrps: o.orderItems.reduce(
        (acc, oi) => {
          acc[productKey(oi, productsById)] = getOrderItemAdjustedMonthlyMsrp(
            msrpByOrderId[o.id].contribution,
            oi,
            productsById,
            msrpByOrderId[o.id].months,
            productMsrpWeightsByOrderId[o.id]
          );
          return acc;
        },
        {} as { [key: string]: number }
      ),
      productMsrpWeights: productMsrpWeightsByOrderId[o.id],
    };
  };

  const aggregateEffectiveMsrp = (
    laterOrder: OrderMsrpValues,
    earlierOrder: OrderMsrpValues
  ): {
    [key: ProductKey]: { value: number; category: ProductCategoryType };
  } => {
    const result: {
      [key: ProductKey]: { value: number; category: ProductCategoryType };
    } = {};
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
      result[pk] = {
        value: laterOrder.productMsrps[pk] - offset / laterOrder.msrp.months,
        category: productsById[orderItem.productId].productCategoryType,
      };
      // console.log(pk, result[pk]);
    }
    return result;
  };

  const laterOrderMsrpValues = orderMsrpValues(orders.laterOrder);
  const earlierOrderMsrpValues = orderMsrpValues(orders.earlierOrder);

  const effectiveMsrp = aggregateEffectiveMsrp(
    laterOrderMsrpValues,
    earlierOrderMsrpValues
  );

  const effectiveMonthlyTotal = Math.ceil(
    Object.values(effectiveMsrp).reduce((acc, value) => acc + value.value, 0)
  );
  const effectiveMonthlySelfgrown = Math.ceil(
    Object.values(effectiveMsrp)
      .filter((v) => v.category == ProductCategoryType.SELFGROWN)
      .reduce((acc, value) => acc + value.value, 0)
  );
  const effectiveMonthlyCooperation =
    effectiveMonthlyTotal - effectiveMonthlySelfgrown;

  const result: Msrp = {
    ...laterOrderMsrpValues.msrp,
    monthly: {
      total: effectiveMonthlyTotal,
      selfgrown: effectiveMonthlySelfgrown,
      cooperation: effectiveMonthlyCooperation,
      selfgrownCompensation: undefined,
    },
    yearly: {
      total: 0,
      selfgrown: 0,
      cooperation: 0,
      selfgrownCompensation: undefined,
    },
  };
  const adaptedMsrp = adaptSelfgrownCompensation(
    msrpByOrderId[orders.earlierOrder.id],
    result
  );
  console.log("effectiveMsrp", adaptedMsrp);
  return adaptedMsrp;
};
