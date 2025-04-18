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
import { language } from "../../../shared/src/lang/lang.ts";
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
import { useTextContentStore } from "../store/textContentStore.ts";
import { prettyDateWithDayName } from "../../../shared/src/util/dateHelper.ts";

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
const textContentStore = useTextContentStore();
const { productsById, deliveredByProductIdDepotId, capacityByDepotId } =
  storeToRefs(biStore);
const { depots } = storeToRefs(configStore);
const { productCategories } = storeToRefs(productStore);
const { organizationInfo, pdfTexts } = storeToRefs(textContentStore);

const loading = ref(false);
const error = ref<string>();
const editConfirmationDialog = ref(false);
const editConfirmationDialogMessage = ref("");
const showShipmentItems = ref(true);
const showAdditionalShipmentItems = ref(true);

const onDeleteAdditionalShipmentItem = (idx: number) => {
  editShipment.value.additionalShipmentItems.splice(idx, 1);
};

const onDeleteShipmentItem = (idx: number) => {
  editShipment.value.shipmentItems.splice(idx, 1);
};

const onAddAdditionalShipmentItem = () => {
  editShipment.value.additionalShipmentItems.push({
    depotIds: [],
    quantity: 0,
    totalShipedQuantity: 0,
    isBio: false,
    description: null,
    showItem: true,
  });
  showAdditionalShipmentItems.value = true;
};

const onAddShipmentItem = () => {
  editShipment.value.shipmentItems.push({
    depotIds: [],
    totalShipedQuantity: 0,
    isBio: false,
    description: null,
    multiplicator: 100,
    conversionFrom: 1,
    conversionTo: 1,
    showItem: true,
  });
  showShipmentItems.value = true;
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

const shouldAddMargin = (idx: number) => {
  if (idx === 0) return false;
  const currentItem = editShipment.value.shipmentItems[idx];
  const previousItem = editShipment.value.shipmentItems[idx - 1];
  return currentItem.productId !== previousItem.productId;
};

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
  if (
    savedShipment?.value?.active &&
    new Date(savedShipment?.value.validFrom) < new Date()
  ) {
    // if the shipment is active and the validFrom is in the past, we need to confirm the change
    editConfirmationDialog.value = true;
    return;
  }
  onSaveConfirmed();
};

const onSaveConfirmed = (revisionMessage?: string) => {
  editConfirmationDialog.value = false;
  editConfirmationDialogMessage.value = "";
  loading.value = true;
  editShipment.value.requisitionConfigId = configStore.activeConfigId;
  saveShipment({
    ...prepareShipment(
      editShipment.value,
      deliveredByProductIdDepotId.value,
      capacityByDepotId.value,
    ),
    revisionMessage,
  })
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
    organizationInfo.value,
    pdfTexts.value.packagingListHeader,
    pdfTexts.value.packagingListFooter,
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
    <v-card
      :prepend-icon="
        editShipment.active ? 'mdi-check-circle' : 'mdi-circle-outline'
      "
    >
      <template v-slot:title>
        {{ t.title }} {{ prettyDateWithDayName(editShipment.validFrom) }} (KW
        {{ getISOWeek(editShipment.validFrom).toString() }})
      </template>
      <v-card-text style="overflow-y: auto">
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
          <v-col cols="7">
            <v-text-field
              label="Beschreibung"
              v-model="editShipment.description"
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="2">
            <v-checkbox
              label="veröffentlicht"
              v-model="editShipment.active"
            ></v-checkbox>
          </v-col>
        </v-row>
        <div class="text-h5">
          <v-icon v-if="showShipmentItems" @click="showShipmentItems = false"
            >mdi-collapse-all</v-icon
          >
          <v-icon v-else @click="showShipmentItems = true"
            >mdi-expand-all</v-icon
          >Produkte ({{ editShipment.shipmentItems.length }})
        </div>
        <v-list class="ma-0 pa-0" v-if="showShipmentItems">
          <v-list-item
            v-if="!editShipment.shipmentItems.length"
            class="opacity-50"
          >
            <v-icon>mdi-information-outline</v-icon>
            Bisher keine Produkte hinzugefügt
          </v-list-item>
          <template v-for="(item, idx) in editShipment.shipmentItems">
            <v-list-item
              class="ma-0 pa-0"
              v-if="item.showItem"
              :class="{ 'mt-8': shouldAddMargin(idx) }"
            >
              <ShipmentItem
                :shipment-item="item"
                :used-depot-ids-by-product-id="usedShipmentDepotIdsByProductId"
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
        <div class="text-h5">
          <v-icon
            v-if="showAdditionalShipmentItems"
            @click="showAdditionalShipmentItems = false"
            >mdi-collapse-all</v-icon
          >
          <v-icon v-else @click="showAdditionalShipmentItems = true"
            >mdi-expand-all</v-icon
          >Zusatzprodukte ({{ editShipment.additionalShipmentItems.length }})
        </div>
        <v-list class="ma-0 pa-0" v-if="showAdditionalShipmentItems">
          <v-list-item
            v-if="!editShipment.additionalShipmentItems.length"
            class="opacity-50"
          >
            <v-icon>mdi-information-outline</v-icon>
            Bisher keine Zusatzprodukte hinzugefügt
          </v-list-item>
          <template v-for="(item, idx) in editShipment.additionalShipmentItems">
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
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onAddShipmentItem"> Produkt hinzufügen </v-btn>
        <v-btn @click="onAddAdditionalShipmentItem">
          Zusatzprodukt hinzufügen
        </v-btn>
        <v-btn @click="onClose"> {{ language.app.actions.close }} </v-btn>
        <v-btn :loading="loading" @click="onSave" :disabled="!canSave">
          {{ language.app.actions.save }}
        </v-btn>
        <v-btn
          :loading="loading"
          @click="onShipmentPdfClick"
          :disabled="disableDownloadPdf"
        >
          Lieferscheine
        </v-btn>
        <v-btn
          :loading="loading"
          @click="onShipmentOverviewPdfClick"
          :disabled="disableDownloadPdf"
        >
          Übersicht
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="editConfirmationDialog">
    <v-card
      max-width="800"
      class="mx-auto"
      prepend-icon="mdi-alert-circle-outline"
    >
      <template v-slot:title
        >Änderung einer bereits veröffentlichten Lieferung bestätigen</template
      >
      <v-card-text>
        Die Lieferung liegt in der Vergangenheit und ist bereits veröffentlicht.
        Eine Änderung ist nur vorgesehen, falls die tatsächliche Lieferung von
        der zuvor veröffentlichten Lieferung abweicht. Um sie speichern zu
        können, bitte eine Änderungsmeldung eingeben.
      </v-card-text>
      <v-card-text>
        <v-text-field
          label="Änderungsmeldung"
          v-model="editConfirmationDialogMessage"
          :rules="[(v) => !!v.trim() || 'Änderungsmeldung ist erforderlich']"
        ></v-text-field>
        <v-alert type="warning" class="mt-2" variant="outlined"
          >Diese Anpassung kann nur durch Admins erfolgen!</v-alert
        >
      </v-card-text>
      <v-card-actions>
        <v-btn @click="() => onSaveConfirmed(editConfirmationDialogMessage)"
          >Speichern</v-btn
        >
        <v-btn @click="editConfirmationDialog = false"> Abbrechen </v-btn>
      </v-card-actions>
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
