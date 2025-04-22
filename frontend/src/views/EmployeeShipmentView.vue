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
import { format, getISOWeek } from "date-fns";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";
import { language } from "../../../shared/src/lang/lang.ts";
import { Id, ShipmentWithRevisionMessages } from "../../../shared/src/types.ts";
import { prettyDate } from "../../../shared/src/util/dateHelper.ts";
import BusyIndicator from "../components/BusyIndicator.vue";
import ShipmentDialog from "../components/ShipmentDialog.vue";
import SeasonText from "../components/styled/SeasonText.vue";
import { getShipments } from "../requests/shipment.ts";
import { useBIStore } from "../store/biStore.ts";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import DeliveryOverview from "../components/shipment/DeliveryOverview.vue";

const t = language.pages.shipment;

const shipmentsWithoutItems = ref<ShipmentWithRevisionMessages[]>([]);

const biStore = useBIStore();
const configStore = useConfigStore();
const productStore = useProductStore();

const { activeConfigId } = storeToRefs(configStore);
const open = ref(false);
const busy = ref<boolean>(true);
const editShipmentId = ref<number | undefined>();
const currentTab = ref("shipments");

const onCreateShipment = () => {
  editShipmentId.value = undefined;
  open.value = true;
};

const onClose = async () => {
  editShipmentId.value = undefined;
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
  editShipmentId.value = item.id;
  open.value = true;
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
    <v-tabs v-model="currentTab">
      <v-tab value="shipments">Verteilungen</v-tab>
      <v-tab value="overview">Übersicht</v-tab>
    </v-tabs>
    <v-tabs-window v-model="currentTab">
      <v-tabs-window-item value="shipments">
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
              {
                title: 'Datum der Verteilung',
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
                  :icon="
                    item.active ? 'mdi-check-circle' : 'mdi-circle-outline'
                  "
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
          <p v-else-if="!busy">
            Keine Verteilungen in <SeasonText /> vorhanden
          </p>
        </v-card-text>
      </v-tabs-window-item>
      <v-tabs-window-item value="overview">
        <v-card-text>
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
    </v-tabs-window>
  </v-card>
  <ShipmentDialog
    :open="open"
    :edit-shipment-id="editShipmentId"
    @close="onClose"
  />
</template>

<style scoped></style>
