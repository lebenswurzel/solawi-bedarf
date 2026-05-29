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
import { CommercialDeliveryFullInformation } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { prettyDate } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper.ts";
import { onMounted, ref } from "vue";
import { getCommercialDeliveries } from "../../requests/commercial.ts";
import BusyIndicator from "../BusyIndicator.vue";
import CommercialDeliveryDialog from "./CommercialDeliveryDialog.vue";

const t = language.pages.commercial;

const deliveries = ref<CommercialDeliveryFullInformation[]>([]);
const busy = ref(true);
const open = ref(false);
const editDeliveryId = ref<number | undefined>();

const refresh = async () => {
  busy.value = true;
  deliveries.value = (await getCommercialDeliveries(undefined, false)).deliveries;
  busy.value = false;
};

onMounted(refresh);

const headers = [
  { title: "Datum", key: "deliveryDate" },
  { title: "Kunde", key: "companyName" },
  { title: "Rechnung", key: "invoiceNumber" },
  { title: "Aktiv", key: "active" },
];

const onCreate = () => {
  editDeliveryId.value = undefined;
  open.value = true;
};

const onRowClick = (
  _event: MouseEvent,
  { item }: { item: CommercialDeliveryFullInformation },
) => {
  editDeliveryId.value = item.id;
  open.value = true;
};

const onClose = async () => {
  editDeliveryId.value = undefined;
  open.value = false;
  await refresh();
};
</script>

<template>
  <BusyIndicator :busy="busy" />
  <v-card-text v-if="!busy">
    <v-btn class="mb-4" @click="onCreate">
      {{ t.action.createDelivery }}
    </v-btn>
    <v-data-table
      :headers="headers"
      :items="deliveries"
      @click:row="onRowClick"
      item-value="id"
    >
      <template #item.deliveryDate="{ item }">
        {{ prettyDate(item.deliveryDate) }}
      </template>
      <template #item.companyName="{ item }">
        {{ item.companyName || item.customerName }}
      </template>
      <template #item.invoiceNumber="{ item }">
        {{ item.invoice?.invoiceNumber || "—" }}
      </template>
      <template #item.active="{ item }">
        {{
          item.active
            ? language.app.options.active.true
            : language.app.options.active.false
        }}
      </template>
    </v-data-table>
  </v-card-text>
  <CommercialDeliveryDialog
    :open="open"
    :edit-delivery-id="editDeliveryId"
    @close="onClose"
  />
</template>
