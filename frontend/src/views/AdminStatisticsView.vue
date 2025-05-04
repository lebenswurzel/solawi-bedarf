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
import HomeStatsCard from "../components/HomeStatsCard.vue";
import ProductStatistics from "../components/statistics/ProductStatistics.vue";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore.ts";
import { useUserStore } from "../store/userStore.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import OrderStatistics from "../components/statistics/OrderStatistics.vue";
import ApplicantMap from "../components/applicant/ApplicantMap.vue";

const configStore = useConfigStore();
const biStore = useBIStore();
const userStore = useUserStore();
const tab = ref("products");

onMounted(async () => {
  await configStore.update();
  await biStore.update(configStore.activeConfigId);
  await userStore.update();
});
</script>

<template>
  <HomeStatsCard />
  <v-card class="ma-2">
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
  </v-card>
</template>
