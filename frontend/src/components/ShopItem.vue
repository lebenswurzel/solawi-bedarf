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
import { language } from "../../../shared/src/lang/lang.ts";
import { interpolate } from "../../../shared/src/lang/template.ts";
import { useOrderStore } from "../store/orderStore.ts";
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useBIStore } from "../store/biStore";
import {
  getMaxAvailable,
  getMinAvailable,
  sanitizeOrderItem,
} from "../../../shared/src/validation/capacity.ts";
import { useUserStore } from "../store/userStore.ts";
import { useConfigStore } from "../store/configStore.ts";
import { isIncreaseOnly } from "../../../shared/src/validation/requisition";
import { getLangUnit } from "../../../shared/src/util/unitHelper.ts";

const t = language.pages.shop.cards.products.item;

const props = defineProps<{ productId: number }>();
const orderStore = useOrderStore();
const biStore = useBIStore();
const userStore = useUserStore();
const configStore = useConfigStore();

const { savedOrderItemsByProductId } = storeToRefs(orderStore);
const { soldByProductId, submit, productsById, now } = storeToRefs(biStore);
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
    { value: savedOrderItem || 0, productId: props.productId },
    productsById.value,
    soldByProductId.value,
  );
});

const minValueAvailable = computed(() => {
  const savedOrderItem = savedOrderItemsByProductId.value[props.productId];
  if (config.value) {
    return getMinAvailable(
      { value: savedOrderItem || 0, productId: props.productId },
      currentUser.value?.role,
      config.value,
      now.value,
      productsById.value,
    );
  }
  return product.value.quantityMin;
});

const model = ref<string>();

const onUpdate = (value: string) => {
  model.value = value;
};

/*
const onClear = () => {
  let value = 0;
  if (
    configStore.orderConfig.increaseOnly &&
    userStore.currentUser?.role != UserRole.ADMIN
  ) {
    value = savedOrderItemsByProductKey.value[product.value.id] || 0;
  }
  model.value = value.toString();
  orderStore.updateOrderItem(product.value.id, value);
};
*/

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
    orderStore.updateOrderItem(product.value.id, value);
  }
};

watch([productsById, savedOrderItemsByProductId], () => {
  model.value =
    savedOrderItemsByProductId.value[props.productId]?.toString() || "0";
});
onMounted(() => {
  model.value =
    savedOrderItemsByProductId.value[props.productId]?.toString() || "0";
});
</script>

<template>
  <v-container class="pa-0">
    <v-row no-gutters align="center" justify="center">
      <v-col cols="12" sm="5">
        {{ product.name }}
        <v-tooltip :text="product.description" v-if="product.description">
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props">mdi-information-outline</v-icon>
          </template>
        </v-tooltip>
      </v-col>
      <v-col cols="3" sm="2">
        <v-tooltip
          :text="
            interpolate(t.freq, { freq: product.frequency?.toString() || '1' })
          "
        >
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props">mdi-truck-fast-outline</v-icon>
          </template>
        </v-tooltip>
        {{ product.frequency }}
      </v-col>
      <v-col cols="3" sm="2">
        <v-tooltip
          :text="interpolate(t.stock, { stock: percentageSold.toString() })"
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
      <v-col cols="6" sm="3">
        <v-text-field
          :label="interpolate(t.value, { unit: unit })"
          type="number"
          :min="minValueAvailable"
          :max="maxValueAvailable"
          :step="product.quantityStep"
          :model-value="model"
          :disabled="!product?.active || !submit"
          @update:model-value="onUpdate"
          @update:focused="onBlur"
        ></v-text-field>
      </v-col>
    </v-row>
  </v-container>
</template>
