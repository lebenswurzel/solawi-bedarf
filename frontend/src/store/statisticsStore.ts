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
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { format } from "date-fns";
import {
  calculateEffectiveMsrpChain,
  calculateEffectiveOrderValidMonths,
  calculateOrderValidMonths,
  getMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp.ts";
import type {
  AvailabilityWeights,
  DateString,
  Msrp,
  OrderId,
  ProductId,
  SavedOrder,
  UserId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getAllOrders } from "../requests/shop.ts";
import { useBIStore } from "./biStore.ts";
import { useConfigStore } from "./configStore.ts";
import { useUserStore } from "./userStore.ts";
import { useVersionInfoStore } from "./versionInfoStore.ts";
import { getAvailabilityWeights } from "../requests/bi.ts";
import { isDebugEnabled } from "../lib/debug.ts";

export interface OrderExt extends SavedOrder {
  userName: string;
  depotName: string;
  msrp: Msrp;
  effectiveMsrp: Msrp;
  validMonths: number;
  effectiveValidMonths: number;
}

export interface OrdersGroupedByMonth {
  month: string;
  orders: OrderExt[];
  offerSum: number;
  msrpSum: number;
  differenceSum: number;
  count: number;
  isSumOrAverage: boolean;
}

function isEmpty(obj: SavedOrder): boolean {
  return obj && Object.keys(obj).length === 0;
}

export const useStatisticsStore = defineStore("statistics", () => {
  const orders = ref<OrderExt[]>([]);
  const processedOrders = ref(0);
  const isProcessing = ref(false);

  const configStore = useConfigStore();
  const userStore = useUserStore();
  const biStore = useBIStore();
  const versionInfoStore = useVersionInfoStore();
  const { depots, config } = storeToRefs(configStore);

  const relevantOrders = computed(() =>
    orders.value.filter((o) => o.offer > 0),
  );

  const productAvailabilityMapByValidFromString = ref<{
    [key: DateString]: {
      [
        key: ProductId
      ]: AvailabilityWeights["availabilityByProductId"][ProductId];
    };
  }>({});
  const productMsrpWeightsByValidFromString = ref<{
    [key: DateString]: { [key: ProductId]: number };
  }>({});

  /**
   * Group orders by month. Uses all months between validFrom and validTo of the current config.
   */
  const ordersGroupedByMonth = computed((): OrdersGroupedByMonth[] => {
    if (!config.value?.validFrom || !config.value?.validTo) {
      return [];
    }
    const months: { middleOfMonth: Date; name: string }[] = [];
    for (
      let i = new Date(config.value.validFrom);
      i <= config.value.validTo;
      i.setMonth(i.getMonth() + 1)
    ) {
      months.push({
        middleOfMonth: new Date(i.getFullYear(), i.getMonth(), 15),
        name: format(i, "yyyy-MM"),
      });
    }
    const result = Object.values(
      relevantOrders.value.reduce(
        (acc, o) => {
          months.forEach((month) => {
            if (o.validFrom && o.validFrom > month.middleOfMonth) {
              return;
            }
            if (o.validTo && o.validTo < month.middleOfMonth) {
              return;
            }
            acc[month.name] = acc[month.name] || {
              orders: [],
              offerSum: 0,
              msrpSum: 0,
              differenceSum: 0,
              count: 0,
              month: month.name,
            };
            acc[month.name] = {
              orders: [...acc[month.name].orders, o],
              offerSum: o.offer + acc[month.name].offerSum,
              msrpSum: o.effectiveMsrp.monthly.total + acc[month.name].msrpSum,
              differenceSum:
                o.offer -
                o.effectiveMsrp.monthly.total +
                acc[month.name].differenceSum,
              count: 1 + acc[month.name].count,
              month: month.name,
              isSumOrAverage: false,
            };
          });
          return acc;
        },
        {} as {
          [key: string]: {
            orders: OrderExt[];
            offerSum: number;
            msrpSum: number;
            differenceSum: number;
            count: number;
            month: string;
            isSumOrAverage: boolean;
          };
        },
      ),
    );

    const count = result.filter((r) => !r.isSumOrAverage).length;

    const sumRow = {
      orders: result.map((r) => r.orders).flat(),
      offerSum: result.reduce((acc, r) => acc + r.offerSum, 0),
      msrpSum: result.reduce((acc, r) => acc + r.msrpSum, 0),
      differenceSum: result.reduce((acc, r) => acc + r.differenceSum, 0),
      count: result.reduce((acc, r) => acc + r.count, 0) / count,
      month: "Summe",
      isSumOrAverage: true,
    };

    const averageRow = {
      orders: sumRow.orders,
      offerSum: sumRow.offerSum / count,
      msrpSum: sumRow.msrpSum / count,
      differenceSum: sumRow.differenceSum / count,
      count: sumRow.count,
      month: "Durchschnitt",
      isSumOrAverage: true,
    };

    return [...result, sumRow, averageRow];
  });

  const update = async (configId?: number) => {
    const id = configId ?? configStore.activeConfigId;
    const config = configStore.config!;
    const timezone = versionInfoStore.versionInfo?.serverTimeZone;
    processedOrders.value = 0;
    isProcessing.value = true;

    const allOrderExts: OrderExt[] = [];
    const userOrdersById: { [key: UserId]: OrderExt[] } = {};
    const validFromDateStrings = new Set<DateString>();

    // retrieve all orders
    await Promise.all(
      userStore.userOptions.map(async (u) => {
        const userOrders = await getAllOrders(u.value, id);
        userOrdersById[u.value] = [];
        processedOrders.value++;
        for (const order of userOrders) {
          if (isEmpty(order) || !order.orderItems) {
            return undefined;
          }
          const depot = depots.value.filter((d) => d.id == order.depotId);
          const effectiveValidMonths = calculateEffectiveOrderValidMonths(
            config,
            order,
            timezone,
          );
          const validMonths = calculateOrderValidMonths(
            order.validFrom,
            config.validTo,
            timezone,
          );
          const msrp = getMsrp(
            order.category,
            order.orderItems,
            biStore.productsById,
            validMonths,
          );

          const extOrder = {
            ...order,
            msrp,
            effectiveMsrp: msrp,
            effectiveValidMonths,
            validMonths,
            userName: u.title,
            depotName: depot.length ? depot[0].name : "unbekannt",
          };

          allOrderExts.push(extOrder);
          userOrdersById[u.value].push(extOrder);
        }
      }),
    );

    // retrieve availability weights for all validFrom dates
    allOrderExts.forEach((o) => {
      validFromDateStrings.add(o.validFrom.toISOString());
    });

    productAvailabilityMapByValidFromString.value = {};
    productMsrpWeightsByValidFromString.value = {};
    await Promise.all(
      Array.from(validFromDateStrings).map(async (dateString) => {
        const date = new Date(dateString);
        const { availabilityByProductId, msrpWeightsByProductId } =
          await getAvailabilityWeights(config.id, date, true);
        productAvailabilityMapByValidFromString.value[dateString] =
          availabilityByProductId;
        productMsrpWeightsByValidFromString.value[dateString] =
          msrpWeightsByProductId;
      }),
    );

    if (isDebugEnabled()) {
      console.log("productAvailabilityMapByValidFromString", {
        ...productAvailabilityMapByValidFromString.value,
      });
      console.log("productMsrpWeightsByValidFromString", {
        ...productMsrpWeightsByValidFromString.value,
      });
    }

    // calculate effective msrp for all orders
    Object.values(userOrdersById).forEach((userOrders) => {
      const productMsrpWeightsByOrderId = userOrders.reduce(
        (acc, o) => {
          acc[o.id] =
            productMsrpWeightsByValidFromString.value[
              o.validFrom.toISOString()
            ];
          return acc;
        },
        {} as { [key: OrderId]: { [key: ProductId]: number } },
      );

      const rawMsrpByOrderId = userOrders.reduce(
        (acc, o) => {
          acc[o.id] = o.msrp;
          return acc;
        },
        {} as { [key: OrderId]: Msrp },
      );

      const effectiveMsrpChain = calculateEffectiveMsrpChain(
        userOrders,
        rawMsrpByOrderId,
        productMsrpWeightsByOrderId,
        biStore.productsById,
      );
      userOrders.forEach((o, index) => {
        // this also modifies the same object in allOrderExts
        o.effectiveMsrp = effectiveMsrpChain[index];
      });

      if (
        isDebugEnabled() &&
        userOrders.length > 0 &&
        userOrders[0].userId === 333
      ) {
        console.log("effectiveMsrpChain", effectiveMsrpChain);
        console.log("userOrders", userOrders);
      }
    });

    orders.value = allOrderExts.filter((o) => !!o);
    isProcessing.value = false;
  };

  return {
    orders,
    processedOrders,
    isProcessing,
    relevantOrders,
    ordersGroupedByMonth,
    update,
  };
});
