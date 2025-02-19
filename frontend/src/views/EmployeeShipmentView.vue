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
} from "../../../shared/src/types.ts";
import { getShipments } from "../requests/shipment.ts";
import { storeToRefs } from "pinia";
import SeasonText from "../components/styled/SeasonText.vue";
import BusyIndicator from "../components/BusyIndicator.vue";

const t = language.pages.shipment;

const defaultEditShipment: EditShipment = {
  description: null,
  validFrom: addDays(setHours(setMinutes(setSeconds(new Date(), 0), 0), 12), 1),
  shipmentItems: [],
  additionalShipmentItems: [],
  active: false,
  requisitionConfigId: -1,
};

const shipments = ref<(Shipment & Id)[]>([]);

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
  open.value = true;
};

const onEditShipment = (dialogShipment: Shipment & Id) => {
  const shipmentItems: EditShipmentItem[] = (
    dialogShipment.shipmentItems || []
  ).map((item) => {
    return {
      ...item,
      showItem: true,
      depotIds: [item.depotId],
    };
  });

  const additionalShipmentItems: EditAdditionalShipmentItem[] = (
    dialogShipment.additionalShipmentItems || []
  ).map((item) => {
    return {
      ...item,
      showItem: true,
      depotIds: [item.depotId],
    };
  });

  shipment.value = {
    ...dialogShipment,
    shipmentItems: shipmentItems,
    additionalShipmentItems: additionalShipmentItems,
  };
  savedShipment.value = dialogShipment;
  open.value = true;
};

const onClose = async () => {
  open.value = false;
  await biStore.update(activeConfigId.value);
  shipments.value = (await getShipments(activeConfigId.value)).shipments;
};

const refresh = async () => {
  busy.value = true;
  await productStore.update(activeConfigId.value);
  await biStore.update(activeConfigId.value);
  shipments.value = (await getShipments(activeConfigId.value)).shipments;
  busy.value = false;
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
      <v-list v-if="shipments.length > 0">
        <v-list-item
          v-for="shipment in shipments.slice().reverse()"
          @click="() => onEditShipment(shipment)"
        >
          <v-icon :icon="shipment.active ? 'mdi-truck-check' : 'mdi-sprout'" />

          {{ format(shipment.validFrom, "dd.MM.yyyy") }} - KW
          {{ getISOWeek(shipment.validFrom).toString() }}

          <v-icon v-if="shipment.description" icon="mdi-arrow-right" />
          {{ shipment.description || "" }}
        </v-list-item>
      </v-list>
      <p v-else-if="!busy">Keine Verteilungen in <SeasonText /> vorhanden</p>
    </v-card-text>
  </v-card>
  <ShipmentDialog :open="open" @close="onClose" />
</template>
