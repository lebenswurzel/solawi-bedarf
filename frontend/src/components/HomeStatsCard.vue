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
import { useConfigStore } from "../store/configStore.ts";
import { language } from "../lang/lang.ts";
import { interpolate } from "../lang/template.ts";
import { computed } from "vue";
import { useBIStore } from "../store/biStore";
import { ProductCategoryType } from "../../../shared/src/enum.ts";
import SeasonText from "../components/styled/SeasonText.vue";

const t = language.pages.home;
const configStore = useConfigStore();
const biStore = useBIStore();

const percentageBudget = computed(() => {
  if (biStore.offers && configStore.config?.budget) {
    return Math.round((1200 * biStore.offers) / configStore.config?.budget);
  }
  return 0;
});

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

const percentageSold = computed(() => {
  const stock = selfGrownProducts.value;
  if (stock.length) {
    return Math.round(
      (stock
        .map((value) => value.sold.sold / value.sold.quantity)
        .reduce((acc, cur) => {
          acc = acc + cur;
          return acc;
        }, 0) *
        100) /
        stock.length,
    );
  }
  return 0;
});
</script>

<template>
  <v-card class="ma-4">
    <v-card-title style="white-space: normal">
      Budget und Stand der Bedarfsanmeldung für <SeasonText plain />
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-row dense align="center">
            <v-col cols="4" sm="12" md="auto" class="d-flex justify-center">
              <v-progress-circular
                :model-value="percentageBudget"
                :size="80"
                :width="15"
                color="blue"
                class="ma-2"
              >
                <v-tooltip
                  :text="
                    interpolate(t.cards.shop.offers, {
                      offers: biStore.offers.toString(),
                    })
                  "
                >
                  <template v-slot:activator="{ props }">
                    <v-icon v-bind="props">mdi-cash-multiple</v-icon>
                  </template>
                </v-tooltip>
              </v-progress-circular>
            </v-col>
            <v-col cols="8" sm="12" md="auto" class="d-flex justify-center">
              <span class="text-medium-emphasis">
                {{
                  interpolate(t.cards.shop.offers, {
                    offers: biStore.offers.toString(),
                  })
                }}
              </span>
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="12" sm="6">
          <v-row dense align="center">
            <v-col cols="4" sm="12" md="auto" class="d-flex justify-center">
              <v-progress-circular
                :model-value="percentageSold"
                :size="80"
                :width="15"
                color="green"
                class="ma-2"
              >
                <v-tooltip
                  :text="
                    interpolate(t.cards.shop.food, {
                      food: percentageSold.toString(),
                    })
                  "
                >
                  <template v-slot:activator="{ props }">
                    <v-icon v-bind="props">mdi-sprout-outline</v-icon>
                  </template>
                </v-tooltip>
              </v-progress-circular>
            </v-col>
            <v-col cols="8" sm="12" md="auto" class="d-flex justify-center">
              <span class="text-medium-emphasis">
                {{
                  interpolate(t.cards.shop.food, {
                    food: percentageSold.toString(),
                  })
                }}
              </span>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
