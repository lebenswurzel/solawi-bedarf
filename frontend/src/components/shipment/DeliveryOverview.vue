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
import { useProductStore } from "../../store/productStore";
import DeliveryOverviewTable from "./DeliveryOverviewTable.vue";
import { dateToString, stringToDate } from "../../lib/convert";
import { useBIStore } from "../../store/biStore";
import { ref } from "vue";
import { useConfigStore } from "../../store/configStore";

const productStore = useProductStore();
const dateOfInterest = ref<Date>(new Date());
const biStore = useBIStore();
const configStore = useConfigStore();

const onDateChange = () => {
  biStore.update(
    configStore.activeConfigId,
    undefined,
    undefined,
    dateOfInterest.value,
  );
};
</script>
<template>
  <v-alert class="mb-2" type="info" variant="tonal">
    Übersichten über bereits erfolgte Verteilungen in der jeweiligen Kategorie.
    In die Berechnung mit einbezogen sind alle Verteilungen dieser Saison, die
    veröffentlicht sind und deren Lieferdatum in der Vergangenheit liegt.
    Hervorgehobenene Werte zeigen an, dass das jeweilige Produkt in dem
    entsprechenden Depot bisher seltener geliefert wurde als in anderen Depots.
    <br />
    Ein <v-icon size="14">mdi-alert</v-icon> bedeutet, dass das Produkts in
    diesem Depot schon mindestens zwei Lieferungen im Rückstand ist.
    <h4>Datumsauswahl:</h4>
    Über die Datumsauswahl kann die Übersicht für ein bestimmtes Datum angezeigt
    werden. Standardmäßig wird die Übersicht für das aktuelle Datum angezeigt.
    Es können auch Datumswerte in der Zukunft ausgewählt werden, um angepasste
    Bedarfsanmeldungen darzustellen.
  </v-alert>

  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="8">
        <v-text-field
          label="Datum"
          type="datetime-local"
          :model-value="dateToString(dateOfInterest)"
          @update:model-value="
            (val: string) => (dateOfInterest = stringToDate(val) || new Date())
          "
          hint="Übersicht für dieses Datum anzeigen"
          persistent-hint
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-btn block @click="onDateChange">Aktualisieren</v-btn>
      </v-col>
    </v-row>
  </v-container>

  <v-expansion-panels>
    <v-expansion-panel
      v-for="productCategory in productStore.productCategories"
    >
      <v-expansion-panel-title>
        {{ productCategory.name }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <DeliveryOverviewTable
          :product-category-with-products="productCategory"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
