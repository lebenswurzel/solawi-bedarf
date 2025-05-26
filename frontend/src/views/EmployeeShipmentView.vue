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
import DeliveryOverview from "../components/shipment/DeliveryOverview.vue";
import { useProductStore } from "../store/productStore.ts";
import ShipmentTable from "../components/shipment/ShipmentTable.vue";
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";

const t = language.pages.shipment;

const productStore = useProductStore();

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
          <v-alert class="mb-2" type="info" variant="tonal">
            Übersichten über bereits erfolgte Verteilungen in der jeweiligen
            Kategorie. In die Berechnung mit einbezogen sind alle Verteilungen
            dieser Saison, die veröffentlicht sind und deren Lieferdatum in der
            Vergangenheit liegt. Hervorgehobenene Werte zeigen an, dass das
            jeweilige Produkt in dem entsprechenden Depot bisher seltener
            geliefert wurde als in anderen Depots.
          </v-alert>
          <v-expansion-panels>
            <v-expansion-panel
              v-for="productCategory in productStore.productCategories"
            >
              <v-expansion-panel-title>
                {{ productCategory.name }}
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <DeliveryOverview
                  :product-category-with-products="productCategory"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-tabs-window-item>
      <v-tabs-window-item value="forecast">
        <ShipmentTable :shipment-type="ShipmentType.FORECAST" />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<style scoped></style>
