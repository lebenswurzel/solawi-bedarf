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
import { _UnwrapAll, defineStore } from "pinia";
import { computed, ref } from "vue";
import { getAllOrders } from "../requests/shop.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config.ts";
import { SavedOrder } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";

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
  const currentOrderId = ref<number | undefined>(undefined);

  // New fields for multiple orders support
  const allOrders = ref<SavedOrder[]>([]);

  const modificationOrder = ref<SavedOrder | null>(null);

  const orderItems = computed(() =>
    Object.entries(actualOrderItemsByProductId.value).map(
      ([productId, actual]) => ({
        productId: parseInt(productId),
        value: actual,
      }),
    ),
  );

  const updateOrderItem = (productId: number, value: number) => {
    actualOrderItemsByProductId.value[productId] = value;
  };

  const update = async (requestUserId: number, configId: number) => {
    const orders = await getAllOrders(requestUserId, configId);
    allOrders.value = orders;

    const now = new Date();

    // Find the modification order thats validFrom time is after now
    const modOrder = orders.find((o) => o.validFrom && o.validFrom > now);
    if (modOrder) {
      modificationOrder.value = modOrder;
    }

    // Find the current order
    const order: SavedOrder =
      orders.find((o) => o.validFrom && o.validFrom <= now) || orders[0];

    offer.value = order.offer || 0;
    offerReason.value = order.offerReason || null;
    depotId.value = { saved: order.depotId, actual: order.depotId };
    alternateDepotId.value = order.alternateDepotId;
    category.value = order.category || appConfig.defaultCategory;
    categoryReason.value = order.categoryReason || null;
    savedOrderItemsByProductId.value = {};
    validFrom.value = order.validFrom ? new Date(order.validFrom) : null;
    validTo.value = order.validTo ? new Date(order.validTo) : null;
    currentOrderId.value = order.id || undefined;
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
    orderItems,
    validFrom,
    validTo,
    allOrders,
    modificationOrder,
    currentOrderId,
    updateOrderItem,
    update,
    clear,
  };
});
