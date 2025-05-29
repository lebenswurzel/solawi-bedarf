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
import { computed, ref } from "vue";
import { ProductCategoryWithProducts } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { useConfigStore } from "../../store/configStore";
import { useBIStore } from "../../store/biStore";
import { storeToRefs } from "pinia";

const props = defineProps<{
  productCategoryWithProducts?: ProductCategoryWithProducts;
}>();

const configStore = useConfigStore();
const biStore = useBIStore();
const { depots } = storeToRefs(configStore);
const { deliveredByProductIdDepotId } = storeToRefs(biStore);
const search = ref<string>("");

const sortedDepots = computed(() => {
  const relevantDepots = Object.values(deliveredByProductIdDepotId.value)
    .flatMap((productDeliveries) => Object.keys(productDeliveries))
    .map(Number)
    .filter((value, index, self) => self.indexOf(value) === index);
  return depots.value
    .sort((a, b) => {
      return a.rank - b.rank;
    })
    .filter((d) => relevantDepots.includes(d.id));
});

const headers = computed(() => {
  const baseHeaders = [{ title: "Produkt", key: "name" }];
  const depotHeaders = sortedDepots.value
    .filter((d) => d.active)
    .map((depot) => ({
      title: depot.name,
      key: `depot_${depot.id}`,
    }));
  return [...baseHeaders, ...depotHeaders];
});

const getDeliveryInfo = (productId: number, depotId: number) => {
  const deliveryInfo = deliveredByProductIdDepotId.value[productId]?.[depotId];
  if (!deliveryInfo) {
    return { label: "", isMaximum: true, isMinimum: false };
  }

  const product = props.productCategoryWithProducts?.products.find(
    (p) => p.id === productId,
  );
  if (!product) {
    return { label: "", isMaximum: true, isMinimum: false };
  }

  const allValues = [
    ...Object.values(deliveredByProductIdDepotId.value[productId]).map(
      (p) => p.actuallyDelivered,
    ),
  ];

  const deliveredMaximum = Math.max(...allValues);
  const deliveredMinimum = Math.min(...allValues);

  // count how many differnt values exists
  const differentValues = new Set(allValues);
  const differentValuesCount = differentValues.size;

  const isMinimum =
    deliveredMinimum == deliveryInfo.actuallyDelivered &&
    differentValuesCount > 2;

  return {
    label: `${deliveryInfo.actuallyDelivered / 100}/${product.frequency}`,
    isMaximum: deliveredMaximum == deliveryInfo.actuallyDelivered,
    isMinimum,
  };
};

const tableData = computed(() => {
  if (!props.productCategoryWithProducts) {
    return [];
  }
  return [...props.productCategoryWithProducts.products];
});

const deliveryInfoCache = computed(() => {
  const cache: Record<
    number,
    Record<number, ReturnType<typeof getDeliveryInfo>>
  > = {};
  tableData.value.forEach((product) => {
    cache[product.id] = {};
    sortedDepots.value.forEach((depot) => {
      cache[product.id][depot.id] = getDeliveryInfo(product.id, depot.id);
    });
  });
  return cache;
});
</script>

<template>
  <v-text-field
    prepend-inner-icon="mdi-magnify"
    v-model="search"
    variant="underlined"
    label="Suche nach Produkt"
    hide-details
    single-line
    clearable
    class="mb-2"
  />
  <v-data-table
    :headers="headers"
    :items="tableData"
    :item-value="(item) => item"
    :items-per-page="10"
    :search="search"
    :header-props="{ class: 'text-caption' }"
  >
    <template v-slot:item="{ item }">
      <tr>
        <td class="text-caption">{{ item.name }}</td>
        <td v-for="depot in sortedDepots" :key="depot.id">
          <template v-if="deliveryInfoCache[item.id]?.[depot.id]">
            <div
              :class="
                deliveryInfoCache[item.id][depot.id].isMaximum
                  ? 'opacity-80'
                  : 'font-weight-bold'
              "
            >
              {{ deliveryInfoCache[item.id][depot.id].label }}
              <v-icon
                v-if="deliveryInfoCache[item.id][depot.id].isMinimum"
                size="14"
                class="ml-1 opacity-60"
              >
                mdi-alert
              </v-icon>
            </div>
          </template>
        </td>
      </tr>
    </template>
  </v-data-table>
</template>
