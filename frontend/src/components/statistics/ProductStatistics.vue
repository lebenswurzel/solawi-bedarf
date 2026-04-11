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
import { ProductCategoryType } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import type {
  ProductsById,
  SoldByProductId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { useBIStore } from "../../store/biStore";
import { useProductStore } from "../../store/productStore.ts";
import { useStatisticsStore } from "../../store/statisticsStore.ts";

const t = language.pages.statistics;
const biStore = useBIStore();
const productStore = useProductStore();
const statisticsStore = useStatisticsStore();

function iconForCategoryType(typ: ProductCategoryType) {
  return typ === ProductCategoryType.COOPERATION
    ? "mdi-truck-delivery"
    : "mdi-sprout";
}

function statsForProductCategoryId(
  productCategoryId: number,
  soldByProductId: SoldByProductId,
  productsById: ProductsById,
) {
  const entries = Object.entries(soldByProductId)
    .filter(([productId]) => {
      const product = productsById[parseInt(productId)];
      return product?.productCategoryId === productCategoryId;
    })
    .map(([productId, value]) => ({
      sold: value,
      product: productsById[parseInt(productId)]!,
    }));

  const topProducts = entries
    .map((value) => ({
      percentageSold: value.sold.quantity
        ? (value.sold.sold / value.sold.quantity) * 100
        : 0,
      name: value.product.name,
      money: Math.ceil(
        (statisticsStore.totalMsrpByProductId[value.product.id] ?? 0) / 12,
      ),
    }))
    .sort((a, b) => b.money - a.money);

  const sum = topProducts.reduce((acc, value) => acc + value.money, 0);

  return { topProducts, sum };
}

const categoryPanels = computed(() => {
  const soldByProductId = biStore.soldByProductId;
  const productsById = biStore.productsById;
  return productStore.productCategories.map((pc) => ({
    id: pc.id,
    title: pc.name,
    icon: iconForCategoryType(pc.typ),
    ...statsForProductCategoryId(pc.id, soldByProductId, productsById),
  }));
});
</script>

<template>
  <v-card-title>
    {{ t.productsCard.title }}
  </v-card-title>
  <v-card-text>
    <p class="mb-4">
      {{ t.productsCard.text }}
    </p>
    <v-expansion-panels multiple>
      <v-expansion-panel v-for="panel in categoryPanels" :key="panel.id">
        <v-expansion-panel-title class="d-flex flex-wrap align-center ga-2">
          <v-icon :icon="panel.icon" />
          <span>{{ panel.title }}</span>
          <v-spacer />
          <span class="text-body-2 text-medium-emphasis">
            {{ Math.ceil(panel.sum) }}€ pro Monat
          </span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p v-if="panel.topProducts.length === 0" class="text-medium-emphasis">
            {{ t.productsCard.emptyCategory }}
          </p>
          <v-row v-else>
            <v-col cols="12" sm="6" md="4" v-for="item in panel.topProducts">
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
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card-text>
</template>
