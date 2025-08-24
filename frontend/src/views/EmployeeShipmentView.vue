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
import { ref } from "vue";
import ShipmentTable from "../components/shipment/ShipmentTable.vue";
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import DeliveryOverview from "../components/shipment/DeliveryOverview.vue";

const t = language.pages.shipment;

const currentTab = ref("shipments");
</script>

<template>
  <v-card class="ma-2">
    <v-card-title> {{ t.title }} </v-card-title>
    <v-tabs v-model="currentTab">
      <v-tab value="shipments">Verteilungen</v-tab>
      <v-tab value="overview"> Übersicht </v-tab>
      <v-tab value="forecast">Prognose</v-tab>
    </v-tabs>
    <v-tabs-window v-model="currentTab">
      <v-tabs-window-item value="shipments">
        <ShipmentTable :shipment-type="ShipmentType.NORMAL" />
      </v-tabs-window-item>
      <v-tabs-window-item value="overview">
        <v-card-text>
          <DeliveryOverview />
        </v-card-text>
      </v-tabs-window-item>
      <v-tabs-window-item value="forecast">
        <ShipmentTable :shipment-type="ShipmentType.FORECAST" />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<style scoped></style>
