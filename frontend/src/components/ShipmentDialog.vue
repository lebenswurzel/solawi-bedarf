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
import { getISOWeek } from "date-fns";
import { storeToRefs } from "pinia";
import { Ref, computed, inject, ref } from "vue";
import {
  EditShipment,
  Id,
  OptionalId,
  Shipment,
} from "../../../shared/src/types.ts";
import { language } from "../lang/lang.ts";
import { dateToString, stringToDate } from "../lib/convert.ts";
import { createShipmentOverviewPdf } from "../lib/shipment/shipmentOverviewPdf.ts";
import { createShipmentPackagingPdfs } from "../lib/shipment/shipmentPackagingPdf.ts";
import { prepareShipment } from "../lib/shipment/prepareShipment.ts";
import { saveShipment } from "../requests/shipment.ts";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore";
import { useProductStore } from "../store/productStore";
import AdditionalShipmentItem from "./AdditionalShipmentItem.vue";
import ShipmentItem from "./ShipmentItem.vue";

const t = language.pages.shipment.dialog;

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const editShipment = inject<Ref<EditShipment & OptionalId>>(
  "dialogShipment",
) as Ref<EditShipment & OptionalId>;
const savedShipment = inject<Ref<Shipment & Id>>("savedShipment");

const biStore = useBIStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const { productsById, deliveredByProductIdDepotId, capacityByDepotId } =
  storeToRefs(biStore);
const { depots } = storeToRefs(configStore);
const { productCategories } = storeToRefs(productStore);

const loading = ref(false);
const error = ref<string>();

const onDeleteAdditionalShipmentItem = (idx: number) => {
  editShipment.value.additionalShipmentItems.splice(idx, 1);
};

const onDeleteShipmentItem = (idx: number) => {
  editShipment.value.shipmentItems.splice(idx, 1);
};

const onAddAdditionalShipmentItem = () => {
  editShipment.value.additionalShipmentItems.unshift({
    depotIds: [],
    quantity: 0,
    totalShipedQuantity: 0,
    isBio: false,
    description: null,
    showItem: true,
  });
};

const onAddShipmentItem = () => {
  editShipment.value.shipmentItems.unshift({
    depotIds: [],
    totalShipedQuantity: 0,
    isBio: false,
    description: null,
    multiplicator: 100,
    conversionFrom: 1,
    conversionTo: 1,
    showItem: true,
  });
};

const usedShipmentDepotIdsByProductId = computed(() => {
  const tmp: { [key: number]: number[] } = {};
  editShipment.value.shipmentItems.forEach((item) => {
    if (item.productId) {
      if (!tmp[item.productId]) {
        tmp[item.productId] = [];
      }
      tmp[item.productId].push(...item.depotIds);
    }
  });
  return tmp;
});

const usedAdditionalShipmentDepotIdsByProduct = computed(() => {
  const tmp: { [key: string]: number[] } = {};
  editShipment.value.additionalShipmentItems.forEach((item) => {
    if (item.product?.trim()) {
      const name = item.product.trim();
      if (!tmp[name]) {
        tmp[name] = [];
      }
      tmp[name].push(...item.depotIds);
    }
  });
  return tmp;
});

const canSave = computed(() => {
  return (
    editShipment.value.shipmentItems.every(
      (item) => item.productId && item.unit && item.depotIds.length,
    ) &&
    editShipment.value.additionalShipmentItems.every(
      (item) => item.product && item.unit && item.depotIds.length,
    )
  );
});

const disableDownloadPdf = computed(() => {
  return (
    !savedShipment?.value ||
    savedShipment.value.shipmentItems.length !=
      editShipment.value.shipmentItems.length ||
    savedShipment.value.additionalShipmentItems.length !=
      editShipment.value.additionalShipmentItems.length
  );
});

const onClose = () => {
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveShipment(
    prepareShipment(
      editShipment.value,
      deliveredByProductIdDepotId.value,
      capacityByDepotId.value,
    ),
  )
    .then(() => {
      loading.value = false;
      emit("close");
    })
    .catch((e: Error) => {
      console.log(e);
      error.value = e.message;
      loading.value = false;
    });
};

const onShipmentPdfClick = async () => {
  if (!savedShipment?.value) {
    return;
  }
  loading.value = true;
  createShipmentPackagingPdfs(
    savedShipment.value,
    depots.value,
    productsById.value,
    productCategories.value,
  ).then(() => {
    loading.value = false;
  });
};

const onShipmentOverviewPdfClick = async () => {
  if (!savedShipment?.value) {
    return;
  }
  loading.value = true;
  createShipmentOverviewPdf(
    savedShipment.value,
    depots.value,
    productsById.value,
    productCategories.value,
  ).then(() => {
    loading.value = false;
  });
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-toolbar density="compact" dark>
        <v-btn
          prepend-icon="mdi-content-save"
          :loading="loading"
          @click="onSave"
          :disabled="!canSave"
          color="primary"
        >
          {{ language.app.actions.save }}
        </v-btn>
        <v-spacer />
        <v-btn
          prepend-icon="mdi-download"
          :loading="loading"
          @click="onShipmentPdfClick"
          :disabled="disableDownloadPdf"
        >
          Lieferscheine
        </v-btn>
        <v-btn
          prepend-icon="mdi-download"
          :loading="loading"
          @click="onShipmentOverviewPdfClick"
          :disabled="disableDownloadPdf"
        >
          Übersichten
        </v-btn>
        <v-spacer />
        <v-btn prepend-icon="mdi-close" @click="onClose" color="error">
          {{ language.app.actions.close }}
        </v-btn>
      </v-toolbar>
      <v-card-title>
        {{ t.title }} KW {{ getISOWeek(editShipment.validFrom).toString() }}
      </v-card-title>
      <v-card-text style="overflow-y: auto">
        <v-expansion-panels variant="popout">
          <v-expansion-panel>
            <v-expansion-panel-title
              >Datum und Beschreibung</v-expansion-panel-title
            >
            <v-expansion-panel-text class="px-0">
              <v-row align="start" justify="center">
                <v-col cols="3">
                  <v-text-field
                    label="Von"
                    type="datetime-local"
                    :model-value="dateToString(editShipment.validFrom)"
                    @update:model-value="
                      (val: string) =>
                        (editShipment.validFrom =
                          stringToDate(val) || editShipment.validFrom)
                    "
                  ></v-text-field>
                </v-col>
                <v-col cols="8">
                  <v-text-field
                    label="Beschreibung"
                    v-model="editShipment.description"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="1">
                  <v-checkbox
                    label="aktiv"
                    v-model="editShipment.active"
                  ></v-checkbox>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-title
              >Produkte ({{
                editShipment.shipmentItems.length
              }})</v-expansion-panel-title
            >
            <v-expansion-panel-text class="px-0">
              <v-row>
                <v-btn @click="onAddShipmentItem">Produkt hinzufügen</v-btn>
              </v-row>
              <v-row>
                <v-list class="ma-0 pa-0" style="width: 100%">
                  <template v-for="(item, idx) in editShipment.shipmentItems">
                    <v-list-item class="ma-0 pa-0" v-if="item.showItem">
                      <ShipmentItem
                        :shipment-item="item"
                        :used-depot-ids-by-product-id="
                          usedShipmentDepotIdsByProductId
                        "
                      />
                      <template v-slot:append>
                        <v-btn
                          icon="mdi-close-thick"
                          @click="() => onDeleteShipmentItem(idx)"
                        >
                        </v-btn>
                      </template>
                    </v-list-item>
                  </template>
                </v-list>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-title
              >Zusatzprodukte ({{
                editShipment.additionalShipmentItems.length
              }})</v-expansion-panel-title
            >
            <v-expansion-panel-text>
              <v-btn @click="onAddAdditionalShipmentItem"
                >Zusatzprodukt hinzufügen</v-btn
              >
              <v-list class="ma-0 pa-0">
                <template
                  v-for="(item, idx) in editShipment.additionalShipmentItems"
                >
                  <v-list-item class="ma-0 pa-0" v-if="item.showItem">
                    <AdditionalShipmentItem
                      :additional-shipment-item="item"
                      :used-depot-ids-by-product="
                        usedAdditionalShipmentDepotIdsByProduct
                      "
                    />
                    <template v-slot:append>
                      <v-btn
                        icon="mdi-close-thick"
                        @click="() => onDeleteAdditionalShipmentItem(idx)"
                      >
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-dialog>
  <v-snackbar
    :model-value="!!error"
    color="red"
    @update:model-value="() => (error = undefined)"
  >
    {{ error }}
  </v-snackbar>
</template>
