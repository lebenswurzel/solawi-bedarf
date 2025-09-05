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
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { getAllOrders } from "../requests/shop.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config.ts";
import {
  OrderItem,
  SavedOrder,
  SavedOrderWithPredecessor,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { isDateInRange } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper.ts";
import { determineModificationOrderId } from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition.ts";

export const useOrderStore = defineStore("orderStore", () => {
  const savedOrderItemsByProductId = ref<{
    [key: number]: number;
  }>({});
  const actualOrderItemsByProductId = ref<{
    [key: number]: number;
  }>({});
  const depotId = ref<{
    saved: number | undefined;
    actual: number | undefined;
  }>({ saved: undefined, actual: undefined });
  const alternateDepotId = ref<number | null>(null);
  const offer = ref<number>(0);
  const offerReason = ref<string | null>(null);
  const category = ref<UserCategory>(appConfig.defaultCategory);
  const categoryReason = ref<string | null>(null);
  const visibleOrderId = ref<number | undefined>(undefined);

  // id of the order that is valid previous to the modification order
  const predecessorOrderId = ref<number | undefined>(undefined);
  // id of the order that is to be modified
  const modificationOrderId = ref<number | undefined>(undefined);

  const selectedShipmentDate = ref<Date>(new Date());

  // New fields for multiple orders support
  const allOrders = ref<SavedOrderWithPredecessor[]>([]);

  const modificationOrderItems = computed(() =>
    Object.entries(actualOrderItemsByProductId.value).map(
      ([productId, actual]) => ({
        productId: parseInt(productId),
        value: actual,
      }),
    ),
  );

  const findOrderById = (id: number) => {
    return allOrders.value.find((o) => o.id === id);
  };

  const shipmentOrderItems = computed(() => {
    const result =
      allOrders.value.find((o) =>
        isDateInRange(selectedShipmentDate.value, {
          from: o.validFrom,
          to: o.validTo,
        }),
      )?.orderItems || [];
    return result;
  });

  const updateOrderItem = (productId: number, value: number) => {
    console.log("updateOrderItem", productId, value);
    actualOrderItemsByProductId.value[productId] = value;
  };

  const ordersWithActualOrderItems = computed(() => {
    // set actual order item values to the last element of the array
    return allOrders.value.map((o) => ({
      ...o,
      orderItems:
        o.id === modificationOrderId.value && isModifyingOrder.value
          ? modificationOrderItems.value
          : o.orderItems,
    }));
  });

  const modificationOrder = computed(
    (): SavedOrderWithPredecessor | undefined => {
      const order = allOrders.value.find(
        (o) => o.id === modificationOrderId.value,
      );
      console.log("actualOrderItemsByProductId", {
        ...actualOrderItemsByProductId.value,
      });
      if (order) {
        return {
          ...order,
          orderItems: modificationOrderItems.value,
        };
      }
    },
  );

  const predecessorOrder = computed((): SavedOrder | undefined => {
    return allOrders.value.find((o) => o.id === predecessorOrderId.value);
  });

  const isModifyingOrder = computed(() => {
    return (
      modificationOrderId.value !== undefined &&
      visibleOrderId.value === modificationOrderId.value
    );
  });

  const mapOrderItems = (orderItems: OrderItem[]) => {
    if (Array.isArray(orderItems)) {
      return orderItems.reduce(
        (acc, cur) => {
          acc[cur.productId] = cur.value;
          return acc;
        },
        {} as { [key: number]: number },
      );
    }
    return {};
  };

  const update = async (requestUserId: number, configId: number) => {
    const orders = await getAllOrders(requestUserId, configId);
    allOrders.value = orders.map((order) => {
      return {
        ...order,
        predecessorId:
          orders.find(
            (o) => order.validFrom?.getTime() === o.validTo?.getTime(),
          )?.id || null,
      };
    });
    console.log("orderStore.update -> allOrders", { ...allOrders.value });

    const now = new Date();

    modificationOrderId.value = determineModificationOrderId(orders, now);
    const modOrder = allOrders.value.find(
      (o) => o.id === modificationOrderId.value,
    );
    predecessorOrderId.value = modOrder?.predecessorId || undefined;
    const predecessorOrder = getPredecessorOrder(modificationOrderId.value);

    console.log(
      "modificationOrderId",
      modificationOrderId.value,
      "predecessorOrderId",
      predecessorOrderId.value,
    );

    // Find the order that is to be modified
    const order: SavedOrder | undefined =
      modOrder || predecessorOrder || orders[orders.length - 1];

    visibleOrderId.value = order?.id;
    console.log("orderStore.update visibleOrderId", visibleOrderId.value);
  };

  const getPredecessorOrder = (
    orderId: number | undefined,
  ): SavedOrderWithPredecessor | undefined => {
    const predecessorId = allOrders.value.find(
      (o) => o.id === orderId,
    )?.predecessorId;
    return allOrders.value.find((o) => o.id === predecessorId);
  };

  watch(
    [allOrders, visibleOrderId],
    () => {
      console.log("watchEffect visibleOrderId", visibleOrderId.value);
      const order = allOrders.value.find((o) => o.id === visibleOrderId.value);
      offer.value = order?.offer || 0;
      offerReason.value = order?.offerReason || null;
      depotId.value = { saved: order?.depotId, actual: order?.depotId };
      alternateDepotId.value = order?.alternateDepotId || null;
      category.value = order?.category || appConfig.defaultCategory;
      categoryReason.value = order?.categoryReason || null;

      savedOrderItemsByProductId.value = mapOrderItems(order?.orderItems || []);
      actualOrderItemsByProductId.value = mapOrderItems(
        order?.orderItems || [],
      );
    },
    { immediate: true },
  );

  const setVisibleOrderId = (orderId: number) => {
    visibleOrderId.value = orderId;
  };

  const clear = async () => {
    offer.value = 0;
    offerReason.value = null;
    depotId.value = { saved: undefined, actual: undefined };
    alternateDepotId.value = null;
    category.value = appConfig.defaultCategory;
    categoryReason.value = null;
    savedOrderItemsByProductId.value = {};
    actualOrderItemsByProductId.value = {};
    allOrders.value = [];
  };

  return {
    actualOrderItemsByProductId,
    savedOrderItemsByProductId,
    offer,
    offerReason,
    depotId,
    alternateDepotId,
    category,
    categoryReason,
    modificationOrderItems,
    shipmentOrderItems,
    allOrders,
    modificationOrderId,
    ordersWithActualOrderItems,
    modificationOrder,
    predecessorOrder,
    selectedShipmentDate,
    isModifyingOrder,
    visibleOrderId,
    updateOrderItem,
    update,
    clear,
    setVisibleOrderId,
    findOrderById,
    getPredecessorOrder,
  };
});
