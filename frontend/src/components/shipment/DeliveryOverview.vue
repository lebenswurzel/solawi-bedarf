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
    <h4>Wie verwende ich diese Übersicht?</h4>
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
  <v-alert class="mb-2" type="info" variant="tonal">
    <h4>
      Hinweis zur Berücksichtigung von Bedarfsänderungen während der Saison
    </h4>
    <p>
      Insbesondere bei selten bestellten Produkten kann es vorkommen, dass durch
      Bedarfsänderungen während der Saison in einem Depot ein Produkt anfangs
      nicht, in ab einem späteren Monat jedoch schon bestellt wird.
    </p>
    <p>
      Bisher (bis ca. November 2025) wurde dadurch ein irreführender Wert
      angezeigt, der suggeriert hat, dass dieses Depot mit dem Produkt stark
      "unterversorgt" war. Dies ist ab jetzt anders und in die Berechnung für
      die an das Depot erfolgten Lieferungen wird ein fiktiver Wert
      einberechnet, der dem Durchschnitt der an die anderen Depots gelieferten
      Werte entspricht.
    </p>
    <p>
      Depots, bei denen das der Fall ist, sind bei dem jeweiligen Produkt mit
      einer
      <span class="text-decoration-underline">Unterstreichung</span>
      gekennzeichnet und im Tooltip findet sich die Zahl der "angenommenen
      Verteilungen".
    </p>
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
