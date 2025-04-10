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
import { onMounted, provide, ref, watch } from "vue";
import { language } from "../../../shared/src/lang/lang.ts";
import { useBIStore } from "../store/biStore.ts";
import ShipmentDialog from "../components/ShipmentDialog.vue";
import { useConfigStore } from "../store/configStore.ts";
import {
  addDays,
  format,
  getISOWeek,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns";
import { useProductStore } from "../store/productStore.ts";
import {
  EditAdditionalShipmentItem,
  EditShipment,
  EditShipmentItem,
  Id,
  OptionalId,
  Shipment,
  ShipmentFullInformation,
  ShipmentWithRevisionMessages,
} from "../../../shared/src/types.ts";
import { getShipments } from "../requests/shipment.ts";
import { storeToRefs } from "pinia";
import SeasonText from "../components/styled/SeasonText.vue";
import BusyIndicator from "../components/BusyIndicator.vue";
import { prettyDate } from "../../../shared/src/util/dateHelper.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";

const t = language.pages.shipment;

const defaultEditShipment: EditShipment = {
  description: null,
  validFrom: addDays(setHours(setMinutes(setSeconds(new Date(), 0), 0), 12), 1),
  shipmentItems: [],
  additionalShipmentItems: [],
  active: false,
  requisitionConfigId: -1,
};
const { setError } = useUiFeedback();

const shipmentsWithoutItems = ref<ShipmentWithRevisionMessages[]>([]);

const biStore = useBIStore();
const configStore = useConfigStore();
const productStore = useProductStore();

const { activeConfigId } = storeToRefs(configStore);

const shipment = ref<EditShipment & OptionalId>(defaultEditShipment);
const savedShipment = ref<Shipment & Id>();
const open = ref(false);
const busy = ref<boolean>(true);

provide("dialogShipment", shipment);
provide("savedShipment", savedShipment);

const onCreateShipment = () => {
  shipment.value = JSON.parse(JSON.stringify(defaultEditShipment));
  savedShipment.value = undefined;
  open.value = true;
};

const onEditShipment = async (
  selectedShipment: ShipmentWithRevisionMessages & Id,
) => {
  try {
    const shipmentWithItemsResponse: ShipmentFullInformation[] = (
      await getShipments(activeConfigId.value, selectedShipment.id, true)
    ).shipments;

    if (shipmentWithItemsResponse.length !== 1) {
      setError(`Keine Verteilung mit ID=${selectedShipment.id} gefunden`);
      return;
    }
    const shipmentWithItems = shipmentWithItemsResponse[0];

    const shipmentItems: EditShipmentItem[] = (
      shipmentWithItems.shipmentItems || []
    ).map((item) => {
      return {
        ...item,
        showItem: true,
        depotIds: [item.depotId],
      };
    });

    const additionalShipmentItems: EditAdditionalShipmentItem[] = (
      shipmentWithItems.additionalShipmentItems || []
    ).map((item) => {
      return {
        ...item,
        showItem: true,
        depotIds: [item.depotId],
      };
    });

    shipment.value = {
      ...shipmentWithItems,
      shipmentItems: shipmentItems,
      additionalShipmentItems: additionalShipmentItems,
    };
    savedShipment.value = shipmentWithItems;
    open.value = true;
  } catch (error) {
    setError("Fehler beim Laden der Verteilung", error as Error);
  }
};

const onClose = async () => {
  open.value = false;
  await biStore.update(activeConfigId.value);
  shipmentsWithoutItems.value = (
    await getShipments(activeConfigId.value, undefined, false)
  ).shipments;
};

const refresh = async () => {
  if (activeConfigId.value === -1) {
    return;
  }
  busy.value = true;
  await productStore.update(activeConfigId.value);
  await biStore.update(activeConfigId.value);
  shipmentsWithoutItems.value = (
    await getShipments(activeConfigId.value, undefined, false)
  ).shipments;
  busy.value = false;
};

const onRowClick = (
  _event: MouseEvent,
  { item }: { item: ShipmentWithRevisionMessages & Id },
) => {
  onEditShipment(item);
};

onMounted(refresh);
watch(activeConfigId, async () => {
  refresh();
});
</script>

<template>
  <v-card class="ma-2">
    <BusyIndicator :busy="busy" />
    <v-card-title> {{ t.title }} </v-card-title>
    <v-card-text>
      <v-card-actions>
        <v-btn
          @click="onCreateShipment"
          prepend-icon="mdi-account-plus-outline"
          >{{ t.action.createShipment }}</v-btn
        >
      </v-card-actions>
      <v-data-table
        v-if="shipmentsWithoutItems.length > 0"
        :items="shipmentsWithoutItems.slice().reverse()"
        :headers="[
          { title: 'Datum der Verteilung', key: 'validFrom', sortable: true },
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
            {{ format(item.validFrom, "dd.MM.yyyy") }} - KW
            {{ getISOWeek(item.validFrom).toString() }}
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
  </v-card>
  <ShipmentDialog :open="open" @close="onClose" />
</template>

<style scoped></style>
