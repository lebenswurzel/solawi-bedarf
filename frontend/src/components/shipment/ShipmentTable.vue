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
import {
  Id,
  ShipmentWithRevisionMessages,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { prettyDate } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper.ts";
import { format, getISOWeek } from "date-fns";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";
import { getShipments } from "../../requests/shipment.ts";
import { useBIStore } from "../../store/biStore.ts";
import { useConfigStore } from "../../store/configStore.ts";
import { useProductStore } from "../../store/productStore.ts";
import BusyIndicator from "../BusyIndicator.vue";
import ShipmentDialog from "../ShipmentDialog.vue";
import SeasonText from "../styled/SeasonText.vue";
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";

const props = defineProps<{
  shipmentType: ShipmentType;
}>();

const t = language.pages.shipment;

const shipmentsWithoutItems = ref<ShipmentWithRevisionMessages[]>([]);

const biStore = useBIStore();
const configStore = useConfigStore();
const productStore = useProductStore();

const { activeConfigId } = storeToRefs(configStore);
const open = ref(false);
const busy = ref<boolean>(true);
const editShipmentId = ref<number | undefined>();
const isForecast = ref(props.shipmentType == ShipmentType.FORECAST);
const showHelp = ref(false);

const refresh = async () => {
  if (activeConfigId.value === -1) {
    return;
  }
  busy.value = true;
  await productStore.update(activeConfigId.value);
  await biStore.update(activeConfigId.value);
  refreshShipmentList();
};

const onClose = async () => {
  editShipmentId.value = undefined;
  open.value = false;
  await biStore.update(activeConfigId.value);
  refreshShipmentList();
};

const refreshShipmentList = async () => {
  shipmentsWithoutItems.value = (
    await getShipments(
      activeConfigId.value,
      undefined,
      false,
      props.shipmentType,
    )
  ).shipments;
  busy.value = false;
};

onMounted(refresh);

watch(activeConfigId, async () => {
  refresh();
});
const onCreateShipment = () => {
  editShipmentId.value = undefined;
  open.value = true;
};

const onRowClick = (
  _event: MouseEvent,
  { item }: { item: ShipmentWithRevisionMessages & Id },
) => {
  editShipmentId.value = item.id;
  open.value = true;
};
</script>
<template>
  <v-card-text>
    <BusyIndicator :busy="busy" />
    <div v-if="isForecast">
      <v-alert
        class="mb-5"
        closable
        color="info"
        density="compact"
        variant="tonal"
      >
        <template v-slot:title>
          Hinweis zu Prognose-Verteilungen
          <v-btn variant="text" v-if="!showHelp" @click="showHelp = true"
            >Anzeigen</v-btn
          >
        </template>
        <v-expand-transition>
          <div class="text-caption" v-if="showHelp">
            <p class="pt-1">
              Zweck der Prognose-Verteilungen ist es, neuen Ernteteilern, die
              während der Saison dazu kommen, eine sinnvolle Abschätzung ihres
              Orientierungswertes zu geben. Speziell für den Fall, dass zwischen
              Abgabe des Bedarfs und der ersten Verteilung noch mehrere Wochen
              liegen.
            </p>
            <p class="pt-1">
              Die hier angegebenen Produkte werden im genannten Zeitraum so
              behandelt, als wären sie bereits verteilt und kommen daher bei der
              Berechnung des Orientierungswerts des neuen Ernteteilers nicht zum
              Tragen. Tatsächlich verteilte Produkte in diesem Zeitraum werden
              von der Prognose-Verteilung automatisch abgezogen, um eine
              möglichst realitätsnahe Berechnung zu ermöglichen.
            </p>
            <p class="pt-1">
              Der angegebene Prognosezeitraum sollte vor der ersten Verteilung
              enden, bei der neue Ernteteiler dabei sind.
            </p>
            <p class="pt-1">
              Für die Produktmenge kann über den Multiplikator eingestellt
              werden, wie oft das Produkt im Prognosezeitraum verteilt wird (als
              Durchschnittswert über alle Depots hinweg).
            </p>
          </div>
        </v-expand-transition>
      </v-alert>
    </div>
    <v-card-actions>
      <v-btn
        @click="onCreateShipment"
        prepend-icon="mdi-account-plus-outline"
        >{{
          isForecast ? t.action.createForecastShipment : t.action.createShipment
        }}</v-btn
      >
    </v-card-actions>
    <v-data-table
      v-if="shipmentsWithoutItems.length > 0"
      :items="shipmentsWithoutItems.slice().reverse()"
      :headers="[
        {
          title: isForecast ? 'Prognosezeitraum' : 'Datum der Verteilung',
          key: 'validFrom',
          sortable: true,
        },
        { title: 'Beschreibung', key: 'description', sortable: true },
        { title: 'Letzte Änderung', key: 'updatedAt', sortable: true },
        {
          title: 'Änderungshinweise',
          key: 'revisionMessages',
          sortable: false,
        },
      ]"
      @click:row="onRowClick"
    >
      <template v-slot:item.validFrom="{ item }">
        <div class="d-flex align-center">
          <v-icon
            :icon="item.active ? 'mdi-check-circle' : 'mdi-circle-outline'"
            class="mr-2"
          />
          <template v-if="isForecast">
            {{ format(item.validFrom, "dd.MM.yyyy") }} -
            {{ format(item.validTo || new Date(), "dd.MM.yyyy") }}
          </template>
          <template v-else>
            {{ format(item.validFrom, "dd.MM.yyyy") }} - KW
            {{ getISOWeek(item.validFrom).toString() }}
          </template>
        </div>
      </template>
      <template v-slot:item.description="{ item }">
        {{ item.description || "-" }}
      </template>
      <template v-slot:item.updatedAt="{ item }">
        {{ prettyDate(item.updatedAt, true) }}
      </template>
      <template v-slot:item.revisionMessages="{ item }">
        <p
          v-for="revisionMessage in item.revisionMessages"
          :key="revisionMessage.createdAt"
          class="text-caption opacity-60"
        >
          {{
            revisionMessage?.createdAt
              ? prettyDate(revisionMessage.createdAt, true)
              : "?"
          }}
          von {{ revisionMessage?.userName || "?" }}:
          {{ revisionMessage?.message || "?" }}
        </p>
      </template>
    </v-data-table>
    <p v-else-if="!busy">Keine Verteilungen in <SeasonText /> vorhanden</p>
  </v-card-text>
  <ShipmentDialog
    :open="open"
    :edit-shipment-id="editShipmentId"
    :shipment-type="props.shipmentType"
    @close="onClose"
  />
</template>
