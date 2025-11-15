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
import { useUserStore } from "./userStore.ts";
import { isDebugEnabled } from "../lib/debug";

export const useOrderStore = defineStore("orderStore", () => {
  const userStore = useUserStore();
  const { isAdmin } = storeToRefs(userStore);
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
      category:
        o.id === modificationOrderId.value && isModifyingOrder.value
          ? category.value
          : o.category,
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
    if (isDebugEnabled()) {
      console.log("orderStore.update -> allOrders", { ...allOrders.value });
    }

    const now = new Date();

    const modOrderId = determineModificationOrderId(orders, now);
    const predecessorOrder = getPredecessorOrder(modOrderId);

    visibleOrderId.value =
      modOrderId ||
      predecessorOrder?.id ||
      (orders.length > 0 ? orders[orders.length - 1].id : undefined);
    console.log("orderStore.update visibleOrderId", visibleOrderId.value);
  };

  const setModificationOrderId = (orderId: number | undefined) => {
    const modOrder = allOrders.value.find((o) => o.id === orderId);
    modificationOrderId.value = orderId;
    predecessorOrderId.value = modOrder?.predecessorId || undefined;

    console.log(
      "modificationOrderId",
      modificationOrderId.value,
      "predecessorOrderId",
      predecessorOrderId.value,
    );
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

      const validModOrderId = determineModificationOrderId(
        allOrders.value,
        new Date(),
      );
      if (validModOrderId === visibleOrderId.value || isAdmin.value) {
        // allow admin to edit any order
        setModificationOrderId(visibleOrderId.value);
      } else {
        // allow regular users to edit only the current modification order
        setModificationOrderId(undefined);
      }
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
