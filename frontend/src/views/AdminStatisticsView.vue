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
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import HomeStatsCard from "../components/HomeStatsCard.vue";
import ProductStatistics from "../components/statistics/ProductStatistics.vue";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import { useStatisticsStore } from "../store/statisticsStore.ts";
import { useUserStore } from "../store/userStore.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import OrderStatistics from "../components/statistics/OrderStatistics.vue";
import ApplicantMap from "../components/applicant/ApplicantMap.vue";

const configStore = useConfigStore();
const biStore = useBIStore();
const productStore = useProductStore();
const statisticsStore = useStatisticsStore();
const { processedOrders, isProcessing } = storeToRefs(statisticsStore);
const userStore = useUserStore();
const tab = ref("products");
const statisticsReady = ref(false);

onMounted(async () => {
  statisticsReady.value = false;
  try {
    await configStore.update();
    const configId = configStore.activeConfigId;
    await Promise.all([
      biStore.update(configId),
      productStore.update(configId),
    ]);
    await userStore.update();
    await statisticsStore.update(configId);
  } finally {
    statisticsReady.value = true;
  }
});
</script>

<template>
  <HomeStatsCard />
  <v-card class="ma-2">
    <template v-if="!statisticsReady">
      <v-card-text class="py-8">
        <div class="text-body-large">
          {{ language.pages.statistics.loadingMessage }}
        </div>
        <v-progress-linear
          v-if="isProcessing"
          height="12"
          color="primary"
          :max="Math.max(userStore.userOptions.length, 1)"
          :model-value="processedOrders"
        />
        <v-progress-linear v-else indeterminate height="12" color="primary" />
      </v-card-text>
    </template>
    <template v-else>
      <v-tabs align-tabs="center" v-model="tab" stacked>
        <v-tab value="products">
          <v-icon icon="mdi-sprout"></v-icon>

          {{ language.pages.statistics.tabs.products }}
        </v-tab>
        <v-tab value="orders">
          <v-icon icon="mdi-list-box-outline"></v-icon>

          {{ language.pages.statistics.tabs.orders }}
        </v-tab>
        <v-tab value="map">
          <v-icon icon="mdi-map"></v-icon>

          {{ language.pages.statistics.tabs.map }}
        </v-tab>
      </v-tabs>
      <v-tabs-window v-model="tab">
        <v-tabs-window-item value="products">
          <ProductStatistics />
        </v-tabs-window-item>
        <v-tabs-window-item value="orders">
          <OrderStatistics />
        </v-tabs-window-item>
        <v-tabs-window-item value="map">
          <ApplicantMap />
        </v-tabs-window-item>
      </v-tabs-window>
    </template>
  </v-card>
</template>
