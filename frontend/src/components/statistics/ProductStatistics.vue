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
import { computed } from "vue";
import { ProductCategoryType } from "../../../../shared/src/enum.ts";
import { language } from "../../../../shared/src/lang/lang.ts";
import { useBIStore } from "../../store/biStore";
import { convertToBigUnit } from "../../../../shared/src/util/unitHelper.ts";

const t = language.pages.statistics;
const biStore = useBIStore();

const selfGrownProducts = computed(() => {
  return Object.entries(biStore.soldByProductId)
    .filter(
      ([productId]) =>
        biStore.productsById[parseInt(productId)].productCategoryType ==
        ProductCategoryType.SELFGROWN,
    )
    .map(([productId, value]) => ({
      sold: value,
      product: biStore.productsById[parseInt(productId)],
    }));
});

const topProducts = computed(() => {
  return selfGrownProducts.value
    .map((value) => ({
      percentageSold: (value.sold.sold / value.sold.quantity) * 100,
      name: value.product.name,
      money: Math.ceil(
        ((convertToBigUnit(value.sold.sold, value.product.unit).value || 0) *
          value.product.msrp) /
          1200,
      ),
    }))
    .sort((a, b) => b.money - a.money);
});

const selfGrownProductSum = computed(() => {
  return selfGrownProducts.value
    .map(
      (value) =>
        ((convertToBigUnit(value.sold.sold, value.product.unit).value || 0) *
          value.product.msrp) /
        1200,
    )
    .reduce((acc, value) => acc + value, 0);
});
</script>

<template>
  <v-card class="ma-4">
    <v-card-title style="white-space: normal">
      {{ t.productsCard.title }}
    </v-card-title>
    <v-card-text>
      <p class="mb-4">
        {{ t.productsCard.text }}
      </p>
      <p class="mb-4">Summe: {{ Math.ceil(selfGrownProductSum) }}€</p>
      <v-row>
        <v-col cols="12" sm="6" md="4" v-for="item in topProducts">
          <v-progress-circular
            :model-value="item.percentageSold"
            height="30"
            :color="item.percentageSold > 90 ? 'green' : 'blue-grey'"
          >
            <template v-slot:default="{ value }">{{
              Math.ceil(value)
            }}</template>
          </v-progress-circular>
          &nbsp;
          <span class="text-medium-emphasis">
            {{ item.name }} ({{ item.money }}€)
          </span>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
