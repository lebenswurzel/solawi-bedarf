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
import {
  addDays,
  getISOWeek,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns";
import { storeToRefs } from "pinia";
import { computed, ref, watchEffect } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import {
  EditAdditionalShipmentItem,
  EditShipment,
  EditShipmentItem,
  Id,
  OptionalId,
  Shipment,
  ShipmentFullInformation,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import {
  prettyDate,
  prettyDateWithDayName,
} from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper.ts";
import { dateToString, stringToDate } from "../lib/convert.ts";
import { prepareShipment } from "../lib/shipment/prepareShipment.ts";
import { createShipmentOverviewPdf } from "../lib/shipment/shipmentOverviewPdf.ts";
import { createShipmentPackagingPdfs } from "../lib/shipment/shipmentPackagingPdf.ts";
import { getShipments, saveShipment } from "../requests/shipment.ts";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore";
import { useProductStore } from "../store/productStore";
import { useTextContentStore } from "../store/textContentStore.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
import AdditionalShipmentItem from "./AdditionalShipmentItem.vue";
import ShipmentItem from "./ShipmentItem.vue";
import {
  ProductCategoryType,
  ShipmentType,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";

const t = language.pages.shipment;

const { open, editShipmentId, shipmentType } = defineProps<{
  open: boolean;
  editShipmentId: number | undefined;
  shipmentType: ShipmentType;
}>();
const emit = defineEmits<{ (e: "close"): void }>();

const defaultEditShipment: EditShipment = {
  description: null,
  validFrom: addDays(setHours(setMinutes(setSeconds(new Date(), 0), 0), 12), 1),
  shipmentItems: [],
  additionalShipmentItems: [],
  active: false,
  requisitionConfigId: -1,
  type: shipmentType,
};
const editShipment = ref<EditShipment & OptionalId>(defaultEditShipment);
const savedShipment = ref<(Shipment & Id) | undefined>();

const { setError, setSuccess } = useUiFeedback();

const biStore = useBIStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const textContentStore = useTextContentStore();
const { productsById, deliveredByProductIdDepotId, capacityByDepotId } =
  storeToRefs(biStore);
const { depots, activeConfigId } = storeToRefs(configStore);
const { productCategories } = storeToRefs(productStore);
const { organizationInfo, pdfTexts } = storeToRefs(textContentStore);

const loading = ref(false);
const editConfirmationDialog = ref(false);
const editConfirmationDialogMessage = ref("");
const showShipmentItems = ref(true);
const showAdditionalShipmentItems = ref(true);

const productVisibility = ref<{ [key: number]: boolean }>({});
const showHelp = ref(false);

const updateProductVisibility = () => {
  const newVisibility: { [key: number]: boolean } = {};
  editShipment.value.shipmentItems.forEach((item) => {
    if (item.productId) {
      newVisibility[item.productId] =
        item.isNew ?? productVisibility.value[item.productId] ?? false;
    }
  });
  productVisibility.value = newVisibility;
};

const activeProducts = computed((): Array<number> => {
  const indices = Object.values(productVisibility.value)
    .map((visible, index) => ({ visible, index }))
    .filter(({ visible }) => visible)
    .map(({ index }) => index);
  return indices;
});

const onEditShipment = async (shipmentId: number) => {
  try {
    const shipmentWithItemsResponse: ShipmentFullInformation[] = (
      await getShipments(activeConfigId.value, shipmentId, true, shipmentType)
    ).shipments;

    if (shipmentWithItemsResponse.length !== 1) {
      setError(`Keine Verteilung mit ID=${shipmentId} gefunden`);
      return;
    }
    const serverSavedShipment = shipmentWithItemsResponse[0];

    const shipmentItems: EditShipmentItem[] = (
      serverSavedShipment.shipmentItems || []
    ).map((item) => {
      return {
        ...item,
        showItem: true,
        depotIds: [item.depotId],
      };
    });

    const additionalShipmentItems: EditAdditionalShipmentItem[] = (
      serverSavedShipment.additionalShipmentItems || []
    ).map((item) => {
      return {
        ...item,
        showItem: true,
        depotIds: [item.depotId],
      };
    });

    editShipment.value = {
      ...serverSavedShipment,
      shipmentItems,
      additionalShipmentItems,
    };
    savedShipment.value = serverSavedShipment;
    updateProductVisibility();
  } catch (error) {
    setError("Fehler beim Laden der Verteilung", error as Error);
  }
};

const onResetShipment = async () => {
  editShipment.value = JSON.parse(JSON.stringify(defaultEditShipment));
  savedShipment.value = undefined;
  productVisibility.value = {};
};

const onDeleteAdditionalShipmentItem = (idx: number) => {
  editShipment.value.additionalShipmentItems.splice(idx, 1);
};

const onDeleteShipmentItem = (idx: number) => {
  editShipment.value.shipmentItems.splice(idx, 1);
  updateProductVisibility();
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
    isNew: true,
  });
  showShipmentItems.value = true;
  updateProductVisibility();
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
  if (idx === 0) return true;
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
      setSuccess(language.app.uiFeedback.saving.success);
      if (savedShipment.value !== undefined) {
        updateProductVisibility();
        onEditShipment(savedShipment.value.id);
      } else {
        emit("close");
      }
    })
    .catch((e: Error) => {
      console.log(e);
      setError(language.app.uiFeedback.saving.failed, e);
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

watchEffect(async () => {
  console.log("edit shipment id", editShipmentId);
  if (editShipmentId) {
    await onEditShipment(editShipmentId);
  } else {
    await onResetShipment();
  }
});
</script>

<template>
  <v-dialog
    :model-value="open"
    @update:model-value="onClose"
    class="full-height"
  >
    <v-card
      :prepend-icon="
        editShipment.active ? 'mdi-check-circle' : 'mdi-circle-outline'
      "
    >
      <template v-slot:title>
        {{ savedShipment === undefined ? "[NEU] " : "" }}
        <span v-if="shipmentType != ShipmentType.NORMAL" class="bg-info pa-1">
          {{ t.types[shipmentType] }}
        </span>
        {{ t.dialog.title }}
        {{ prettyDateWithDayName(editShipment.validFrom) }} (KW
        {{ getISOWeek(editShipment.validFrom).toString() }})
      </template>
      <template v-slot:subtitle
        >zuletzt gespeichert:
        {{ prettyDate(savedShipment?.updatedAt, true) }}</template
      >
      <v-card-text style="overflow-y: auto">
        <div v-if="editShipment.type == ShipmentType.FORECAST">
          <v-alert
            class="mb-5"
            closable
            color="info"
            density="compact"
            variant="outlined"
          >
            <template v-slot:title>
              Hinweis zu Prognose-Verteilungen
              <v-btn variant="text" v-if="!showHelp" @click="showHelp = true"
                >Anzeigen</v-btn
              >
            </template>
            <v-expand-transition>
              <div class="text-caption" v-if="showHelp">
                Zweck der Prognose-Verteilungen ist es, neuen Ernteteilern, die
                während der Saison dazu kommen, eine sinnvolle Abschätzung ihres
                Orientierungswertes zu geben. Speziell für den Fall, dass
                zwischen Abgabe des Bedarfs und der ersten Verteilung noch
                mehrere Wochen liegen. <br /><br />
                Die hier angegebenen Produkte werden im genannten Zeitraum so
                behandelt, als wären sie bereits verteilt und kommen daher bei
                der Berechnung des Orientierungswerts des neuen Ernteteilers
                nicht zum Tragen. Tatsächlich verteilte Produkte in diesem
                Zeitraum werden von der Prognose-Verteilung automatisch
                abgezogen, um eine möglichst realitätsnahe Berechnung zu
                ermöglichen.<br /><br />
                Der angegebene Prognosezeitraum sollte vor der ersten Verteilung
                enden, bei der neue Ernteteiler dabei sind.
              </div>
            </v-expand-transition>
          </v-alert>
        </div>
        <v-container fluid class="pa-0">
          <v-row align="start" dense>
            <v-col cols="6" md="3">
              <v-text-field
                :label="
                  editShipment.type == ShipmentType.NORMAL
                    ? 'Verteilung am'
                    : 'Prognose von'
                "
                type="datetime-local"
                :model-value="dateToString(editShipment.validFrom)"
                @update:model-value="
                  (val: string) =>
                    (editShipment.validFrom =
                      stringToDate(val) || editShipment.validFrom)
                "
              ></v-text-field>
            </v-col>
            <v-col cols="6" md="3" v-if="shipmentType == ShipmentType.FORECAST">
              <v-text-field
                label="
                  bis "
                type="datetime-local"
                :model-value="dateToString(editShipment.validTo ?? new Date())"
                @update:model-value="
                  (val: string) =>
                    (editShipment.validTo =
                      stringToDate(val) || editShipment.validTo)
                "
              ></v-text-field>
            </v-col>
            <v-col cols="8" :md="shipmentType == ShipmentType.FORECAST ? 4 : 7">
              <v-text-field
                label="Beschreibung"
                v-model="editShipment.description"
                clearable
                :hint="
                  shipmentType == ShipmentType.NORMAL
                    ? 'Die Beschreibung wird den Ernteteilern in ihrer Verteilungsansicht angezeigt'
                    : ''
                "
              ></v-text-field>
            </v-col>
            <v-col cols="4" md="2">
              <v-checkbox
                label="veröffentlicht"
                v-model="editShipment.active"
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-container>
        <div class="text-h5">
          <v-icon v-if="showShipmentItems" @click="showShipmentItems = false"
            >mdi-collapse-all</v-icon
          >
          <v-icon v-else @click="showShipmentItems = true"
            >mdi-expand-all</v-icon
          ><span class="pl-2"
            >Produkte ({{ editShipment.shipmentItems.length }})</span
          >
        </div>
        <template v-if="showShipmentItems">
          <v-alert
            type="info"
            class="text-caption"
            density="compact"
            variant="outlined"
            v-if="
              editShipment.shipmentItems.length &&
              Object.values(productVisibility).length
            "
          >
            Die Produkte sind standardmäßig ausgeblendet und können über die
            nachfolgenden Schaltflächen eingeblendet werden. Die
            unterschiedliche Darstellung kennzeichnet Produkte aus
            <v-chip color="green" size="small">Selbstanbau</v-chip> und
            <v-chip color="blue" variant="outlined" size="small"
              >Kooperationen</v-chip
            >.
          </v-alert>
          <v-chip-group
            :model-value="activeProducts"
            class="mb-2"
            column
            multiple
          >
            <v-chip
              v-for="(visible, productId) in productVisibility"
              :key="productId"
              @click="productVisibility[productId] = !visible"
              :color="
                productsById[productId].productCategoryType ==
                ProductCategoryType.SELFGROWN
                  ? 'green'
                  : 'blue'
              "
              size="small"
              :variant="
                productsById[productId].productCategoryType ==
                ProductCategoryType.SELFGROWN
                  ? 'tonal'
                  : 'outlined'
              "
            >
              <v-icon start>{{ visible ? "mdi-eye" : "" }}</v-icon>
              {{ productsById[productId]?.name }}
            </v-chip>
          </v-chip-group>
        </template>
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
              v-if="
                item.isNew ||
                (item.showItem &&
                  (item.productId
                    ? productVisibility[item.productId] !== false
                    : true))
              "
            >
              <div v-if="shouldAddMargin(idx)" class="text-h6 mb-4">
                {{ item.isNew ? "NEU: " : "" }}
                {{
                  item.productId
                    ? productsById[item.productId].name
                    : "Neues Produkt"
                }}
              </div>
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
        <v-btn
          @click="onAddShipmentItem"
          variant="text"
          class="mb-6"
          prepend-icon="mdi-plus"
        >
          Produkt hinzufügen
        </v-btn>
        <div class="text-h5">
          <v-icon
            v-if="showAdditionalShipmentItems"
            @click="showAdditionalShipmentItems = false"
            >mdi-collapse-all</v-icon
          >
          <v-icon v-else @click="showAdditionalShipmentItems = true"
            >mdi-expand-all</v-icon
          ><span class="pl-2"
            >Zusatzprodukte ({{
              editShipment.additionalShipmentItems.length
            }})</span
          >
        </div>
        <v-list class="ma-0 pa-0" v-if="showAdditionalShipmentItems">
          <div class="text-caption mb-2">
            Als Zusatzprodukt gelten Lebensmittel, die nicht direkt bestellt
            wurden, die aber verfügbar sind und frei an die Depots verteilt
            werden.
          </div>
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
        <v-btn
          @click="onAddAdditionalShipmentItem"
          variant="text"
          class="mb-6"
          prepend-icon="mdi-plus"
        >
          Zusatzprodukt hinzufügen
        </v-btn>
      </v-card-text>
      <v-card-actions>
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
</template>

<style>
.full-height.v-dialog > .v-overlay__content {
  top: 0;
  bottom: 0;
}
</style>
