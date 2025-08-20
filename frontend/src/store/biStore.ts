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
import { useConfigStore } from "./configStore.ts";
import { useOrderStore } from "./orderStore";
import {
  CapacityByDepotId,
  DeliveredByProductIdDepotId,
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
import { useVersionInfoStore } from "./versionInfoStore.ts";

export const useBIStore = defineStore("bi", () => {
  const now = ref<Date>(new Date());
  const configStore = useConfigStore();
  const orderStore = useOrderStore();
  const userStore = useUserStore();
  const versionInfoStore = useVersionInfoStore();

  const { depots, config, activeConfigId } = storeToRefs(configStore);
  const {
    depotId,
    category,
    actualOrderItemsByProductId,
    savedOrderItemsByProductId,
  } = storeToRefs(orderStore);
  const { currentUser } = storeToRefs(userStore);

  const soldByProductId = ref<SoldByProductId>({});
  const capacityByDepotId = ref<CapacityByDepotId>({});
  const productsById = ref<ProductsById>({});
  const deliveredByProductIdDepotId = ref<DeliveredByProductIdDepotId>({});
  const offers = ref<number>(0);

  const submit = computed(() => {
    if (currentUser.value && config.value) {
      return isRequisitionActive(
        currentUser.value.role,
        currentUser.value.active,
        config.value,
        now.value,
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

  const productMsrpWeights = computed((): { [key: ProductId]: number } => {
    const result = calculateMsrpWeights(
      productsById.value,
      deliveredByProductIdDepotId.value,
      depots.value,
    );
    return result;
  });

  const msrp = computed(() => {
    const relevantValidFrom =
      orderStore.modificationOrder?.validFrom || orderStore.validFrom;

    const actualOrderItems = Object.entries(
      actualOrderItemsByProductId.value,
    ).map(([key, value]) => ({ productId: parseInt(key), value }));
    const validMonths = calculateOrderValidMonths(
      relevantValidFrom,
      config.value?.validTo,
      versionInfoStore.versionInfo?.serverTimeZone,
    );

    return getMsrp(
      category.value,
      actualOrderItems,
      productsById.value,
      validMonths,
      productMsrpWeights.value,
    );
  });

  const getEffectiveMsrp = async () => {
    if (activeConfigId.value == -1 || !config.value) {
      return null;
    }
    const orders = orderStore.ordersWithActualOrderItems;
    const ordersWithDeliveredByProductIdDepotId = await Promise.all(
      orders.map(async (o) => {
        const { deliveredByProductIdDepotId } = await getBI(
          activeConfigId.value,
          o.id,
          true,
        );
        return {
          order: o,
          deliveredByProductIdDepotId,
        };
      }),
    );
    const { effectiveMsrp, effectiveMsrpSum } = calculateEffectiveMsrp(
      ordersWithDeliveredByProductIdDepotId,
      productsById.value,
      depots.value,
      config.value,
      versionInfoStore.versionInfo?.serverTimeZone || "UTC",
    );
    return { effectiveMsrp, effectiveMsrpSum };
  };

  const getSavedMsrp = async () => {
    if (activeConfigId.value == -1) {
      return null;
    }
    const savedOrderItems = Object.entries(
      savedOrderItemsByProductId.value,
    ).map(([key, value]) => ({ productId: parseInt(key), value }));

    const validMonths = calculateOrderValidMonths(
      orderStore.validFrom,
      config.value?.validTo,
      versionInfoStore.versionInfo?.serverTimeZone,
    );

    const {
      deliveredByProductIdDepotId: requestDeliveredByProductIdDepotId,
      productsById: requestedProductsById,
    } = await getBI(activeConfigId.value, orderStore.currentOrderId, true);

    const weights = calculateMsrpWeights(
      requestedProductsById,
      requestDeliveredByProductIdDepotId,
      depots.value,
    );
    console.log("weights", weights);

    return getMsrp(
      category.value,
      savedOrderItems,
      requestedProductsById,
      validMonths,
      weights,
    );
  };

  const depot = computed(() => {
    return depots.value.find((d) => d.id == depotId.value.actual);
  });

  const update = async (
    configId: number,
    orderId?: number,
    includeForecast?: boolean,
  ) => {
    const {
      soldByProductId: requestSoldByProductId,
      deliveredByProductIdDepotId: requestDeliveredByProductIdDepotId,
      capacityByDepotId: requestCapacityByDepotId,
      productsById: requestedProductsById,
      offers: requestOffers,
    } = await getBI(configId, orderId, includeForecast);
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
    msrp,
    getSavedMsrp,
    submit,
    increaseOnly,
    offers,
    update,
    now,
    getEffectiveMsrp,
  };
});
