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
import { computed, ref } from "vue";
import { getAllOrders } from "../requests/shop.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config.ts";
import { SavedOrder } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { isDateInRange } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper.ts";

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
  const validFrom = ref<Date | null>(null);
  const validTo = ref<Date | null>(null);

  // id of the order that is currently valid based on the current date
  const currentOrderId = ref<number | undefined>(undefined);
  // id of the order that is to be modified
  const modificationOrderId = ref<number | undefined>(undefined);

  const selectedShipmentDate = ref<Date>(new Date());

  // New fields for multiple orders support
  const allOrders = ref<SavedOrder[]>([]);

  const modificationOrderItems = computed(() =>
    Object.entries(actualOrderItemsByProductId.value).map(
      ([productId, actual]) => ({
        productId: parseInt(productId),
        value: actual,
      }),
    ),
  );

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
        o.id === modificationOrderId.value
          ? modificationOrderItems.value
          : o.orderItems,
    }));
  });

  const modificationOrder = computed((): SavedOrder | undefined => {
    const order = allOrders.value.find(
      (o) => o.id === modificationOrderId.value,
    );
    if (order) {
      return {
        ...order,
        orderItems: order.orderItems.map((o) => ({
          ...o,
          value: actualOrderItemsByProductId.value[o.productId],
        })),
      };
    }
  });

  const currentOrder = computed((): SavedOrder | undefined => {
    return allOrders.value.find((o) => o.id === currentOrderId.value);
  });

  const update = async (requestUserId: number, configId: number) => {
    const orders = await getAllOrders(requestUserId, configId);
    allOrders.value = orders;

    const now = new Date();

    const modOrder = orders.find(
      (o) => o.validFrom && now.getTime() < o.validFrom?.getTime(),
    );
    modificationOrderId.value = modOrder?.id;
    const curOrder = orders.find((o) =>
      isDateInRange(now, {
        from: o.validFrom,
        to: o.validTo,
      }),
    );
    currentOrderId.value = curOrder?.id;

    // Find the order that is to be modified
    const order: SavedOrder = modOrder || curOrder || orders[0];

    offer.value = order.offer || 0;
    offerReason.value = order.offerReason || null;
    depotId.value = { saved: order.depotId, actual: order.depotId };
    alternateDepotId.value = order.alternateDepotId;
    category.value = order.category || appConfig.defaultCategory;
    categoryReason.value = order.categoryReason || null;
    savedOrderItemsByProductId.value = {};
    validFrom.value = order.validFrom ? new Date(order.validFrom) : null;
    validTo.value = order.validTo ? new Date(order.validTo) : null;
    if (Array.isArray(order.orderItems)) {
      savedOrderItemsByProductId.value = order.orderItems.reduce(
        (acc, cur) => {
          acc[cur.productId] = cur.value;
          return acc;
        },
        {} as { [key: number]: number },
      );
    }
    actualOrderItemsByProductId.value = JSON.parse(
      JSON.stringify(savedOrderItemsByProductId.value),
    );
  };

  const clear = async () => {
    offer.value = 0;
    offerReason.value = null;
    depotId.value = { saved: undefined, actual: undefined };
    alternateDepotId.value = null;
    category.value = appConfig.defaultCategory;
    categoryReason.value = null;
    actualOrderItemsByProductId.value = {};
    savedOrderItemsByProductId.value = {};
    validFrom.value = null;
    validTo.value = null;
    allOrders.value = [];
  };

  return {
    savedOrderItemsByProductId,
    actualOrderItemsByProductId,
    offer,
    offerReason,
    depotId,
    alternateDepotId,
    category,
    categoryReason,
    modificationOrderItems,
    shipmentOrderItems,
    validFrom,
    validTo,
    allOrders,
    currentOrderId,
    modificationOrderId,
    ordersWithActualOrderItems,
    modificationOrder,
    currentOrder,
    selectedShipmentDate,
    updateOrderItem,
    update,
    clear,
  };
});
