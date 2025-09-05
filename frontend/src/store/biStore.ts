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
import { computed, ref, watchEffect } from "vue";
import { useConfigStore } from "./configStore.ts";
import { useOrderStore } from "./orderStore";
import {
  CapacityByDepotId,
  DeliveredByProductIdDepotId,
  Msrp,
  OrderId,
  ProductId,
  ProductsById,
  SoldByProductId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getBI } from "../requests/bi.ts";
import { useUserStore } from "./userStore.ts";
import {
  calculateEffectiveMsrp,
  calculateMsrpWeights,
  calculateOrderValidMonths,
  getMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp.ts";
import {
  isIncreaseOnly,
  isRequisitionActive,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { getSameOrNextThursday } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";

export const useBIStore = defineStore("bi", () => {
  const now = ref<Date>(new Date());
  const configStore = useConfigStore();
  const orderStore = useOrderStore();
  const userStore = useUserStore();

  const { depots, config, activeConfigId } = storeToRefs(configStore);
  const {
    depotId,
    category,
    allOrders,
    ordersWithActualOrderItems,
    modificationOrder,
    isModifyingOrder,
  } = storeToRefs(orderStore);
  const { currentUser } = storeToRefs(userStore);

  const soldByProductId = ref<SoldByProductId>({});
  const capacityByDepotId = ref<CapacityByDepotId>({});
  const productsById = ref<ProductsById>({});
  const deliveredByProductIdDepotId = ref<DeliveredByProductIdDepotId>({});
  const offers = ref<number>(0);

  const productMsrpWeightsByOrderId = ref<{
    [key: OrderId]: { [key: ProductId]: number };
  }>({});

  // update productMsrpWeightsByOrderId when orderStore.allOrders changes
  watchEffect(async () => {
    if (allOrders.value.length === 0) {
      // skip if information is still missing
      return;
    }

    const results = await Promise.all(
      allOrders.value.map(async (o) => {
        const {
          deliveredByProductIdDepotId: requestDeliveredByProductIdDepotId,
          productsById: requestProductsById,
        } = await getBI(activeConfigId.value, o.id, true);
        return {
          [o.id]: {
            deliveredByProductIdDepotId: requestDeliveredByProductIdDepotId,
            productsById: requestProductsById,
          },
        };
      }),
    );

    productMsrpWeightsByOrderId.value = Object.assign(
      {},
      ...results.map((result) => {
        return {
          [Object.keys(result)[0]]: calculateMsrpWeights(
            Object.values(result)[0].productsById,
            Object.values(result)[0].deliveredByProductIdDepotId,
            depots.value,
          ),
        };
      }),
    );
    console.log("productMsrpWeightsByOrderId", {
      ...productMsrpWeightsByOrderId.value,
    });
  });

  const submit = computed(() => {
    if (currentUser.value && config.value) {
      return (
        isRequisitionActive(
          currentUser.value.role,
          currentUser.value.active,
          config.value,
          now.value,
        ) &&
        orderStore.modificationOrder?.validFrom &&
        getSameOrNextThursday(
          orderStore.modificationOrder.validFrom,
        ).getTime() > now.value.getTime()
      );
    }
    return false;
  });

  const increaseOnly = computed(() => {
    if (currentUser.value && config.value) {
      return isIncreaseOnly(currentUser.value?.role, config.value, now.value);
    }
    false;
  });

  const rawMsrpByOrderId = computed((): { [key: OrderId]: Msrp } => {
    if (
      Object.keys(productsById.value).length === 0 ||
      !config.value ||
      Object.keys(productMsrpWeightsByOrderId.value).length === 0 ||
      // check that productMsrpWeightsByOrderId contains all orders
      !Object.keys(productMsrpWeightsByOrderId.value).every((orderId) =>
        ordersWithActualOrderItems.value.some(
          (o) => o.id === parseInt(orderId),
        ),
      )
    ) {
      return {};
    }
    const orders = ordersWithActualOrderItems.value;
    const msrpsMap: { [key: OrderId]: Msrp } = {};

    orders.forEach((o) => {
      const actualOrderItems = o.orderItems.map((item) => ({
        productId: item.productId,
        value: item.value,
      }));
      const validMonths = calculateOrderValidMonths(
        o.validFrom,
        config.value?.validTo,
        "Europe/Berlin",
      );
      const relevantCategory =
        o.id === modificationOrder.value?.id && isModifyingOrder.value
          ? category.value
          : o.category;
      console.log("relevantCategory", o.id, relevantCategory);
      const msrp = getMsrp(
        relevantCategory,
        actualOrderItems,
        productsById.value,
        validMonths,
        productMsrpWeightsByOrderId.value[o.id],
      );
      msrpsMap[o.id] = msrp;
    });

    console.log("msrpsMap", msrpsMap);
    return msrpsMap;
  });

  const getEffectiveMsrp = (orderId: OrderId): Msrp | null => {
    const order = allOrders.value.find((o) => o.id === orderId);
    if (!order) {
      return null;
    }
    if (
      activeConfigId.value == -1 ||
      !config.value ||
      Object.keys(rawMsrpByOrderId.value).length === 0
    ) {
      return null;
    }

    const effectiveOrder = ordersWithActualOrderItems.value.find(
      (o) => o.id === orderId,
    );
    if (!effectiveOrder) {
      return null;
    }

    const effectivePredecessorOrder = ordersWithActualOrderItems.value.find(
      (o) => o.id === order.predecessorId,
    );

    if (!effectivePredecessorOrder) {
      return null;
    }

    const effectiveMsrp = calculateEffectiveMsrp(
      {
        earlierOrder: effectivePredecessorOrder,
        laterOrder: effectiveOrder,
      },
      rawMsrpByOrderId.value,
      productMsrpWeightsByOrderId.value,
      productsById.value,
    );
    return effectiveMsrp;
  };

  const effectiveMsrpByOrderId = computed((): { [key: OrderId]: Msrp } => {
    const result = allOrders.value.reduce(
      (acc, o) => {
        acc[o.id] = getEffectiveMsrp(o.id) || rawMsrpByOrderId.value[o.id];
        return acc;
      },
      {} as { [key: OrderId]: Msrp },
    );
    console.log("effectiveMsrpByOrderId", result);
    return result;
  });

  const depot = computed(() => {
    return depots.value.find((d) => d.id == depotId.value.actual);
  });

  const getEffectiveMsrpByOrderId = (orderId: OrderId): Msrp => {
    if (
      Object.keys(effectiveMsrpByOrderId.value).includes(orderId.toString()) &&
      effectiveMsrpByOrderId.value[orderId]
    ) {
      return effectiveMsrpByOrderId.value[orderId];
    }
    return {
      monthly: {
        total: 0,
        selfgrown: 0,
        cooperation: 0,
        selfgrownCompensation: undefined,
      },
      yearly: {
        total: 0,
        selfgrown: 0,
        cooperation: 0,
        selfgrownCompensation: undefined,
      },
      months: 0,
      contribution: UserCategory.CAT130,
    };
  };

  const update = async (
    configId: number,
    orderId?: number,
    includeForecast?: boolean,
    dateOfInterest?: Date,
  ) => {
    const {
      soldByProductId: requestSoldByProductId,
      deliveredByProductIdDepotId: requestDeliveredByProductIdDepotId,
      capacityByDepotId: requestCapacityByDepotId,
      productsById: requestedProductsById,
      offers: requestOffers,
    } = await getBI(configId, orderId, includeForecast, dateOfInterest);
    soldByProductId.value = requestSoldByProductId;
    capacityByDepotId.value = requestCapacityByDepotId;
    productsById.value = requestedProductsById;
    deliveredByProductIdDepotId.value = requestDeliveredByProductIdDepotId;
    now.value = new Date();
    offers.value = requestOffers;
  };

  return {
    soldByProductId,
    capacityByDepotId,
    deliveredByProductIdDepotId,
    productsById,
    depot,
    rawMsrpByOrderId,
    submit,
    increaseOnly,
    offers,
    update,
    now,
    getEffectiveMsrpByOrderId,
    productMsrpWeightsByOrderId,
  };
});
