<!--
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
-->
<script setup lang="ts">
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template.ts";
import { useOrderStore } from "../store/orderStore.ts";
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useBIStore } from "../store/biStore";
import {
  getMaxAvailable,
  getMinAvailable,
  sanitizeOrderItem,
  checkOrderItemValid,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/capacity.ts";
import { useUserStore } from "../store/userStore.ts";
import { useConfigStore } from "../store/configStore.ts";
import { isIncreaseOnly } from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition.ts";
import { getLangUnit } from "@lebenswurzel/solawi-bedarf-shared/src/util/unitHelper.ts";
import DebugOnly from "./debug/DebugOnly.vue";

const t = language.pages.shop.cards.products.item;

const props = defineProps<{ productId: number }>();
const orderStore = useOrderStore();
const biStore = useBIStore();
const userStore = useUserStore();
const configStore = useConfigStore();

const {
  actualOrderItemsByProductId,
  savedOrderItemsByProductId,
  isModifyingOrder,
  visibleOrderId,
} = storeToRefs(orderStore);
const {
  soldByProductId,
  submit,
  productsById,
  now,
  productAvailabilityByOrderId,
} = storeToRefs(biStore);
const { currentUser } = storeToRefs(userStore);
const { config } = storeToRefs(configStore);

const product = computed(() => productsById.value[props.productId]);
const sold = computed(() => {
  return soldByProductId.value[props.productId];
});
const unit = computed(() => getLangUnit(product.value.unit));

const percentageSold = computed(() => {
  return Math.round((100 * sold.value.sold) / sold.value.quantity);
});

const deliveryStats = computed(() => {
  if (
    !productAvailabilityByOrderId.value[visibleOrderId.value ?? 0][
      props.productId
    ]
  ) {
    return {
      percentage: 0,
      roundedDeliveries: 0,
      roundedPercentage: 0,
    };
  }
  const result =
    productAvailabilityByOrderId.value[visibleOrderId.value ?? 0][
      props.productId
    ];

  return {
    ...result,
    roundedPercentage: Math.round(result.deliveryPercentage),
  };
});

const color = computed(() => {
  if (percentageSold.value < 20) return "indigo";
  if (percentageSold.value < 40) return "teal";
  if (percentageSold.value < 60) return "green";
  if (percentageSold.value < 80) return "orange";
  return "red";
});

const maxValueAvailable = computed(() => {
  const savedOrderItem = savedOrderItemsByProductId.value[props.productId];
  return getMaxAvailable(
    savedOrderItem || 0,
    props.productId,
    productsById.value,
    soldByProductId.value,
  );
});

const minValueAvailable = computed(() => {
  if (isModifyingOrder.value) {
    return 0;
  }
  if (config.value) {
    const result = getMinAvailable(
      savedOrderItemsByProductId.value[props.productId] || 0,
      props.productId,
      currentUser.value?.role,
      config.value,
      now.value,
      productsById.value,
    );
    return result;
  }
  return product.value.quantityMin;
});

const hasChanged = computed(() => {
  return (
    (actualOrderItemsByProductId.value[props.productId] || 0) !==
    (savedOrderItemsByProductId.value[props.productId] || 0)
  );
});

const model = ref<string>();
const oldValue = ref<string>();
const errorMessage = ref<string | null>(null);

const onUpdate = (value: string) => {
  model.value = value;
};

const getProductMsrpWeight = (): number => {
  if (!visibleOrderId.value) {
    return 1;
  }
  if (productAvailabilityByOrderId.value[visibleOrderId.value] === undefined) {
    return 1;
  }
  if (
    productAvailabilityByOrderId.value[visibleOrderId.value][
      props.productId
    ] === undefined
  ) {
    return 1;
  }
  return productAvailabilityByOrderId.value[visibleOrderId.value][
    props.productId
  ].msrpWeight;
};

const validateValue = (value: number) => {
  const error = checkOrderItemValid(
    savedOrderItemsByProductId.value[props.productId] || null,
    { value, productId: props.productId },
    soldByProductId.value,
    productsById.value,
    getProductMsrpWeight(),
  );
  errorMessage.value = error;
  return error === null;
};

const onBlur = (blur: boolean) => {
  if (!blur) {
    let value = parseInt(model.value || "0");
    let minValue = minValueAvailable.value;
    if (
      config.value &&
      !isIncreaseOnly(currentUser.value?.role, config.value, now.value)
    ) {
      minValue = 0;
    }
    value = sanitizeOrderItem({
      value,
      minValue: minValue,
      maxValue: maxValueAvailable.value,
      step: product.value.quantityStep,
    });
    model.value = value.toString();
    validateValue(value);
    orderStore.updateOrderItem(product.value.id, value);
  }
};

watch([productsById, savedOrderItemsByProductId], () => {
  model.value =
    savedOrderItemsByProductId.value[props.productId]?.toString() || "0";
});

const visiblePredecessorOrder = computed(() => {
  return orderStore.getPredecessorOrder(visibleOrderId.value);
});

const shouldHighlightMainField = computed(() => {
  const currentValue = parseInt(model.value || "0");
  return currentValue !== 0;
});

const shouldHighlightOldField = computed(() => {
  const oldValueNum = parseInt(oldValue.value || "0");
  return oldValueNum !== 0;
});

const valueIsDifferent = computed(() => {
  return parseInt(model.value || "0") !== parseInt(oldValue.value || "0");
});

onMounted(() => {
  model.value =
    actualOrderItemsByProductId.value[props.productId]?.toString() || "0";
  oldValue.value =
    visiblePredecessorOrder.value?.orderItems
      .find((item) => item.productId === props.productId)
      ?.value?.toString() || "0";
});
</script>

<template>
  <v-container class="pa-0" fluid>
    <v-row dense align="center" justify="center">
      <v-col cols="12" :md="visiblePredecessorOrder ? 6 : 8">
        {{ product.name }}
        <v-tooltip
          :text="product.description"
          v-if="product.description"
          open-on-click
        >
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props">mdi-information-outline</v-icon>
          </template>
        </v-tooltip>
        <DebugOnly>
          <span class="opacity-60 text-caption">
            ID{{ product.id }} {{ productsById[props.productId].msrp }}ct
          </span>
        </DebugOnly>
      </v-col>
      <v-col cols="2" md="1">
        <div>
          <v-tooltip
            :text="
              interpolate(t.freq, {
                freq: product.frequency?.toString() || '1',
              })
            "
            open-on-click
          >
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props">mdi-truck-fast-outline</v-icon>
            </template>
          </v-tooltip>
          {{ product.frequency }}
        </div>
        <div class="opacity-50" v-if="deliveryStats.roundedDeliveries > 0">
          <v-tooltip
            :text="
              interpolate(t.deliveryPercentage, {
                percent: deliveryStats.roundedPercentage.toString(),
              })
            "
            open-on-click
          >
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props">mdi-truck-delivery-outline</v-icon>
            </template>
          </v-tooltip>
          {{ deliveryStats.roundedDeliveries }}
        </div>
      </v-col>
      <v-col cols="2" md="1">
        <v-tooltip
          :text="interpolate(t.stock, { stock: percentageSold.toString() })"
          open-on-click
        >
          <template v-slot:activator="{ props }">
            <v-progress-circular
              :model-value="percentageSold"
              :color="color"
              v-bind="props"
              >{{
                percentageSold < 100 ? percentageSold : ""
              }}</v-progress-circular
            >
          </template>
        </v-tooltip>
      </v-col>
      <v-col :cols="visiblePredecessorOrder ? 4 : 6" md="2">
        <v-text-field
          :label="interpolate(t.value, { unit: unit })"
          type="number"
          :min="minValueAvailable"
          :max="maxValueAvailable"
          :step="product.quantityStep"
          :model-value="model"
          :disabled="!product?.active || !submit || !isModifyingOrder"
          :error-messages="errorMessage"
          @update:model-value="
            (v) => {
              onUpdate(v);
              validateValue(parseInt(v || '0'));
            }
          "
          @update:focused="onBlur"
          variant="outlined"
          :class="{ 'highlighted-field': shouldHighlightMainField }"
        >
          <template
            v-slot:append-inner
            v-if="hasChanged"
            color="info"
            size="small"
          >
            <v-chip color="info" size="x-small">
              {{ savedOrderItemsByProductId[props.productId] || 0 }}
            </v-chip>
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="4" md="2" v-if="visiblePredecessorOrder">
        <v-text-field
          :label="interpolate(t.oldValue, { unit: unit })"
          type="number"
          :model-value="oldValue"
          variant="outlined"
          :disabled="true"
          :class="{ 'highlighted-field': shouldHighlightOldField }"
        >
          <template v-slot:prepend-inner v-if="valueIsDifferent">
            <v-icon>mdi-not-equal-variant</v-icon>
          </template>
        </v-text-field>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.highlighted-field :deep(.v-field__input) {
  background-color: rgba(76, 175, 80, 0.05) !important;
  font-weight: bold;
}
</style>
