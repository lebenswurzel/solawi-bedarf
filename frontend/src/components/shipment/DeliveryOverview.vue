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
import { ProductCategoryWithProducts } from "../../../../shared/src/types";
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
  console.log(relevantDepots);
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
    console.log(
      `depot ${depotId}`,
      sortedDepots.value.find((d) => d.id == depotId),
      deliveredByProductIdDepotId.value[productId],
    );
    return "";
  }

  const product = props.productCategoryWithProducts?.products.find(
    (p) => p.id === productId,
  );
  if (!product) return "?";

  return `${deliveryInfo.actuallyDelivered / 100}/${product.frequency}`;
};

const tableData = computed(() => {
  if (!props.productCategoryWithProducts) {
    return [];
  }
  return [...props.productCategoryWithProducts.products];
});
</script>

<template>
  <v-card>
    <div>
      Übersicht über bereits erfolgte Verteilungen in der Kategorie "{{
        props.productCategoryWithProducts?.name
      }}"
    </div>
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
    >
      <template v-slot:item="{ item }">
        <tr>
          <td>{{ item.name }}</td>
          <td v-for="depot in sortedDepots" :key="depot.id">
            {{ getDeliveryInfo(item.id, depot.id) }}
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>
