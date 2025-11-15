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
  ValidRange,
} from "./types";
import {
  countCalendarMonths,
  getSameOrNextThursday,
  getSameOrPreviousThursday,
} from "./util/dateHelper";

const getYearlyBaseMsrp = (orderItem: OrderItem, product: Product) => {
  if (product) {
    const conversion = product.unit == Unit.PIECE ? 100 : 100000; // convert ct/kg & ct/pcs too €/g & €/pcs
    return (
      ((product.frequency || 1) * product.msrp * orderItem.value) / conversion
    );
  }
  return 0;
};

const applyContribution = (msrp: number, contribution: UserCategory) => {
  return appConfig.msrp[contribution].relative * msrp;
};

export const adjustMsrp = (
  baseMsrp: number,
  contribution: UserCategory,
  months: number
) => {
  if (baseMsrp > 0) {
    return applyContribution(baseMsrp, contribution) / months;
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

/**
 * Calculate the effective number of months of an order.
 * This is the number of months between the first shipment and the end of the season.
 * If the first shipment is after the end of the season, the number of months is 12.
 * If the first shipment is before the start of the season, the number of months is 0.
 */
export const calculateOrderValidMonths = (
  orderValidFrom: Date,
  seasonValidTo?: Date,
  timezone?: string
): number => {
  if (seasonValidTo) {
    let firstShipment = getSameOrNextThursday(orderValidFrom, timezone);
    return Math.min(
      countCalendarMonths(firstShipment, seasonValidTo, timezone),
      12
    );
  }
  return 12;
};

/**
 * Calculate the effective number of months of an order.
 * This is the number of months between the first shipment and the end of the order.
 * If the first shipment is after the end of the order, the number of months is 12.
 * If the first shipment is before the start of the order, the number of months is 0.
 */
export const calculateEffectiveOrderValidMonths = (
  seasonRange: ValidRange,
  orderRange: ValidRange,
  timezone?: string
): number => {
  if (orderRange.validFrom && orderRange.validTo && seasonRange.validFrom) {
    const effectiveOrderValidFrom =
      orderRange.validFrom.getTime() > seasonRange.validFrom.getTime()
        ? orderRange.validFrom
        : seasonRange.validFrom;
    const firstShipment = getSameOrNextThursday(
      effectiveOrderValidFrom,
      timezone
    );
    const lastShipment = getSameOrPreviousThursday(
      orderRange.validTo,
      timezone
    );
    return Math.min(
      countCalendarMonths(firstShipment, lastShipment, timezone),
      12
    );
  }
  return 12;
};

/**
 * Calculate the selfgrown compensation for a modified order and adapt the msrp accordingly
 *
 * This adds a compensation value that offsets a reduction of the selfgrown contribution.
 * The compensation is added to the total contribution and the cooperation contribution.
 * The compensation is not added to the selfgrown contribution.
 *
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
        selfgrownCompensation: compensation * modifiedMsrp.months,
      },
      months: modifiedMsrp.months,
      contribution: modifiedMsrp.contribution,
      effectiveMonths: modifiedMsrp.effectiveMonths,
    };
  }
  return modifiedMsrp;
};

type ProductKey = string;
interface OrderMsrpValues {
  order: Order;
  validFrom: Date;
  msrp: Msrp;
  productMsrpWeights: { [key: ProductId]: number };
  productMsrps: {
    [key: string]: number;
  };
}

const productKey = (
  productId: ProductId,
  productsById: ProductsById
): ProductKey => `${productsById[productId].name}_${productId}`;

const orderMsrpValues = (
  o: SavedOrder,
  msrp: Msrp,
  productMsrpWeights: { [key: ProductId]: number },
  productsById: ProductsById
): OrderMsrpValues => {
  return {
    order: o,
    validFrom: o.validFrom,
    msrp: msrp,
    productMsrps: o.orderItems.reduce(
      (acc, oi) => {
        acc[productKey(oi.productId, productsById)] =
          getOrderItemAdjustedMonthlyMsrp(
            msrp.contribution,
            oi,
            productsById,
            msrp.months,
            productMsrpWeights
          );
        return acc;
      },
      {} as { [key: string]: number }
    ),
    productMsrpWeights: productMsrpWeights,
  };
};

export const calculateEffectiveMsrpChain = (
  orders: SavedOrder[],
  rawMsrpByOrderId: { [key: OrderId]: Msrp },
  productMsrpWeightsByOrderId: { [key: OrderId]: { [key: ProductId]: number } },
  productsById: ProductsById
): Msrp[] => {
  if (orders.length === 0) {
    return [];
  }

  // Track cumulative values per product
  const cumulativeYearlyMsrpByProduct: { [key: ProductKey]: number } = {};
  const cumulativePaidByProduct: { [key: ProductKey]: number } = {};

  const results: Msrp[] = [];
  const relevantProducts: Set<ProductId> = new Set();

  // Process each order in the chain
  for (let i = 0; i < orders.length; i++) {
    const currentOrder = orders[i];
    const nextOrder = i + 1 < orders.length ? orders[i + 1] : null;

    // Calculate effective months and weight for current order
    const currentMonths = rawMsrpByOrderId[currentOrder.id].months;
    const nextMonths = nextOrder ? rawMsrpByOrderId[nextOrder.id].months : 0;
    const effectiveMonths = currentMonths - nextMonths;

    // Track effective MSRP per product for this order
    const effectiveMsrpByProduct: {
      [key: ProductKey]: {
        value: number;
        category: ProductCategoryType;
      };
    } = {};

    // update relevant products with current order items
    for (const orderItem of currentOrder.orderItems) {
      relevantProducts.add(orderItem.productId);
    }

    // Process each product in the current order
    for (const productId of relevantProducts) {
      const orderItem = currentOrder.orderItems.find(
        (oi) => oi.productId === productId
      );
      const pk = productKey(productId, productsById);

      const product = productsById[productId];

      // Get current product values
      const currentWeight =
        productMsrpWeightsByOrderId[currentOrder.id][productId] ?? 0;
      const nextWeight = nextOrder
        ? productMsrpWeightsByOrderId[nextOrder.id][productId]
        : 0;
      const effectiveWeight = currentWeight - nextWeight;

      // Calculate total MSRP for this product (yearly value)
      const totalMsrp = orderItem
        ? applyContribution(
            getYearlyBaseMsrp(orderItem, product),
            currentOrder.category
          )
        : 0;
      const totalValueInRange = totalMsrp * effectiveWeight;
      const remainingValue = totalMsrp * currentWeight;

      // Initialize cumulative values if not present
      if (cumulativeYearlyMsrpByProduct[pk] === undefined) {
        cumulativeYearlyMsrpByProduct[pk] = 0;
      }
      if (cumulativePaidByProduct[pk] === undefined) {
        cumulativePaidByProduct[pk] = 0;
      }

      // Calculate relevant yearly MSRP (cumulative + remaining value)
      const relevantYearlyMsrp =
        cumulativeYearlyMsrpByProduct[pk] + remainingValue;

      // Calculate monthly due effective
      const monthlyDueEffective =
        currentMonths > 0
          ? (relevantYearlyMsrp - cumulativePaidByProduct[pk]) / currentMonths
          : 0;

      // Update cumulative paid
      cumulativePaidByProduct[pk] += monthlyDueEffective * effectiveMonths;

      // Update cumulative yearly MSRP
      cumulativeYearlyMsrpByProduct[pk] += totalValueInRange;

      // Store effective monthly MSRP for this product
      effectiveMsrpByProduct[pk] = {
        value: monthlyDueEffective,
        category: product.productCategoryType,
      };
    }

    // Aggregate effective MSRP across all products
    const effectiveMonthlyTotal = Math.ceil(
      Object.values(effectiveMsrpByProduct).reduce(
        (acc, value) => acc + value.value,
        0
      )
    );
    const effectiveMonthlySelfgrown = Math.ceil(
      Object.values(effectiveMsrpByProduct)
        .filter((v) => v.category == ProductCategoryType.SELFGROWN)
        .reduce((acc, value) => acc + value.value, 0)
    );
    const effectiveMonthlyCooperation =
      effectiveMonthlyTotal - effectiveMonthlySelfgrown;

    // Build result MSRP
    const result: Msrp = {
      ...rawMsrpByOrderId[currentOrder.id],
      monthly: {
        total: effectiveMonthlyTotal,
        selfgrown: effectiveMonthlySelfgrown,
        cooperation: effectiveMonthlyCooperation,
        selfgrownCompensation: undefined,
      },
      yearly: {
        total: effectiveMonthlyTotal * currentMonths,
        selfgrown: effectiveMonthlySelfgrown * currentMonths,
        cooperation: effectiveMonthlyCooperation * currentMonths,
        selfgrownCompensation: undefined,
      },
      effectiveMonths,
    };

    // Apply selfgrown compensation if this is not the first order
    if (i > 0) {
      const adaptedMsrp = adaptSelfgrownCompensation(results[i - 1], result);
      results.push(adaptedMsrp);
    } else {
      results.push(result);
    }
  }

  return results;
};

export const calculateEffectiveMsrp = (
  orders: { laterOrder: SavedOrder; earlierOrder: SavedOrder },
  rawMsrpByOrderId: { [key: OrderId]: Msrp },
  productMsrpWeightsByOrderId: { [key: OrderId]: { [key: ProductId]: number } },
  productsById: ProductsById
): Msrp => {
  interface ProductMsrp {
    msrp: number; // monthly msrp
    weight: number; // remaining amount of the product in the season when the msrp was calculated (0..1)
    months: number; // number of months of start of order until end of season
  }

  const calculateTotalOffset = (
    oldProductMsrp: ProductMsrp,
    newProductMsrp: ProductMsrp
  ) => {
    return (
      oldProductMsrp.msrp *
      (oldProductMsrp.months *
        (1 - oldProductMsrp.weight + newProductMsrp.weight) -
        newProductMsrp.months)
    );
  };

  const aggregateEffectiveMsrp = (
    laterOrder: OrderMsrpValues,
    earlierOrder: OrderMsrpValues
  ): {
    [key: ProductKey]: { value: number; category: ProductCategoryType };
  } => {
    const result: {
      [key: ProductKey]: {
        value: number;
        oldValue?: number;
        category: ProductCategoryType;
      };
    } = {};
    for (const orderItem of laterOrder.order.orderItems) {
      const earlierOrderItem = earlierOrder.order.orderItems.find(
        (oi) => oi.productId === orderItem.productId
      );
      const pk = productKey(orderItem.productId, productsById);
      let offset = 0;
      if (earlierOrderItem) {
        // calculate over/under price paid
        offset = calculateTotalOffset(
          {
            msrp: earlierOrder.productMsrps[pk],
            weight: earlierOrder.productMsrpWeights[orderItem.productId],
            months: earlierOrder.msrp.months,
          },
          {
            msrp: laterOrder.productMsrps[pk],
            weight: laterOrder.productMsrpWeights[orderItem.productId],
            months: laterOrder.msrp.months,
          }
        );

        // if (pk == "Möhre_172") {
        //   console.log(
        //     pk,
        //     offset,
        //     earlierOrder.productMsrps[pk],
        //     earlierOrder.msrp.months,
        //     earlierOrder.productMsrpWeights[orderItem.productId],
        //     laterOrder.msrp.months,
        //     laterOrder.productMsrpWeights[orderItem.productId]
        //   );
        // }
      }
      result[pk] = {
        value: laterOrder.productMsrps[pk] - offset / laterOrder.msrp.months,
        oldValue: earlierOrder.productMsrps[pk],
        category: productsById[orderItem.productId].productCategoryType,
      };

      // const oldTotal = (result[pk].oldValue ?? 0) * earlierOrder.msrp.months;
      // const newTotal = result[pk].value * laterOrder.msrp.months;
      // if (oldTotal != newTotal) {
      //   console.log(pk, newTotal, oldTotal, result[pk]);
      // }
    }
    return result;
  };

  const laterOrderMsrpValues = orderMsrpValues(
    orders.laterOrder,
    rawMsrpByOrderId[orders.laterOrder.id],
    productMsrpWeightsByOrderId[orders.laterOrder.id],
    productsById
  );
  const earlierOrderMsrpValues = orderMsrpValues(
    orders.earlierOrder,
    rawMsrpByOrderId[orders.earlierOrder.id],
    productMsrpWeightsByOrderId[orders.earlierOrder.id],
    productsById
  );

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
    rawMsrpByOrderId[orders.earlierOrder.id],
    result
  );
  // console.log("effectiveMsrp", adaptedMsrp, "result", result);
  return adaptedMsrp;
};
