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
import { Ref, computed, inject, ref } from "vue";
import { language } from "../lang/lang.ts";
import { format } from "date-fns/format";
import { appConfig } from "../../../shared/src/config";
import ShipmentItem from "./ShipmentItem.vue";
import AdditionalShipmentItem from "./AdditionalShipmentItem.vue";
import {
  EditShipment,
  Shipment,
  ShipmentItem as ShipmentItemType,
  AdditionalShipmentItem as AdditionalShipmentItemType,
  OptionalId,
  Id,
} from "../../../shared/src/types.ts";
import {
  stringToDate,
  dateToString,
  valueToDelivered,
  splitTotal,
} from "../lib/convert.ts";
import { getISOWeek } from "date-fns";
import { saveShipment } from "../requests/shipment.ts";
import { generateOverviewPdf, generatePdf } from "../lib/pdf";
import JSZip from "jszip";
import { storeToRefs } from "pinia";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore";
import { useProductStore } from "../store/productStore";
import { getLangUnit } from "../lang/template";
import { multiplicatorOptions } from "../lib/options";
import { sanitizeFileName } from "../../../shared/src/util/fileHelper.ts";

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
  editShipment.value.additionalShipmentItems.push({
    depotIds: [],
    quantity: 0,
    totalShipedQuantity: 0,
    isBio: false,
    description: null,
    showItem: true,
  });
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

  // split total quantity
  const shipmentItems: ShipmentItemType[] = [];
  editShipment.value.shipmentItems.forEach((s) => {
    const deliveredByDepotId = deliveredByProductIdDepotId.value[s.productId!];
    const neededValue = s.depotIds.map((depotId) => ({
      id: depotId,
      value: valueToDelivered({
        value: deliveredByDepotId[depotId].valueForShipment,
        multiplicator: s.multiplicator,
        conversionFrom: s.conversionFrom,
        conversionTo: s.conversionTo,
      }),
    }));
    const conversion = appConfig.shipment.totalQuantityRound[s.unit!];
    const reducedTotal = Math.round(s.totalShipedQuantity / conversion);
    const totalByDepot = splitTotal(neededValue, reducedTotal);

    s.depotIds.forEach((d) => {
      shipmentItems.push({
        productId: s.productId!,
        description: s.description,
        unit: s.unit!,
        depotId: d,
        totalShipedQuantity:
          totalByDepot.find((v) => v.id == d)!.value * conversion,
        conversionFrom: s.conversionFrom,
        conversionTo: s.conversionTo,
        isBio: s.isBio,
        multiplicator: s.multiplicator,
      });
    });
  });

  // split total quantity
  const additionalShipmentItems: AdditionalShipmentItemType[] = [];
  editShipment.value.additionalShipmentItems.forEach((s) => {
    const neededValue = s.depotIds.map((depotId) => ({
      id: depotId,
      value: capacityByDepotId.value[depotId].reserved * s.quantity,
    }));
    const conversion = appConfig.shipment.totalQuantityRound[s.unit!];
    const reducedTotal = Math.round(s.totalShipedQuantity / conversion);
    const totalByDepot = splitTotal(neededValue, reducedTotal);

    s.depotIds.forEach((d) => {
      additionalShipmentItems.push({
        product: s.product!,
        description: s.description,
        unit: s.unit!,
        depotId: d,
        totalShipedQuantity:
          totalByDepot.find((v) => v.id == d)!.value * conversion,
        isBio: s.isBio,
        quantity: s.quantity,
      });
    });
  });

  const shipment: Shipment & OptionalId = {
    description: editShipment.value.description,
    validFrom: editShipment.value.validFrom,
    shipmentItems,
    additionalShipmentItems,
    active: editShipment.value.active,
    id: editShipment.value.id,
    updatedAt: editShipment.value.updatedAt,
  };
  saveShipment(shipment)
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
  const dataByDepotAndProductCategory: {
    [key: string]: {
      [key: string]: {
        Bezeichnung: string;
        Einheit: string;
        Menge: number;
        Bemerkung: string;
      }[];
    };
  } = {};
  for (let item of savedShipment.value.shipmentItems) {
    const depot =
      depots.value.find((d) => d.id == item.depotId)?.name ||
      "Unbekanntes Depot";
    const product = productsById.value[item.productId];
    const productCategory =
      productCategories.value.find((pc) => pc.id == product.productCategoryId)
        ?.name || "Unbekannte Kategorie";
    if (!dataByDepotAndProductCategory[depot]) {
      dataByDepotAndProductCategory[depot] = {};
    }
    if (!dataByDepotAndProductCategory[depot][productCategory]) {
      dataByDepotAndProductCategory[depot][productCategory] = [];
    }
    const multiplicator =
      item.multiplicator != 100
        ? multiplicatorOptions.find((mo) => mo.value == item.multiplicator)
            ?.title
        : "";
    const conversion =
      item.unit != product.unit || item.conversionFrom != item.conversionTo
        ? `(${item.conversionFrom} ${getLangUnit(product.unit)} -> ${item.conversionTo} ${getLangUnit(item.unit)})`
        : "";
    const description = item.description ? item.description : "";
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${product.name}${item.isBio ? " [BIO]" : ""}`,
      Einheit: getLangUnit(item.unit),
      Menge: item.totalShipedQuantity,
      Bemerkung: `${multiplicator} ${conversion} ${description}`,
    });
  }
  for (let item of savedShipment.value.additionalShipmentItems) {
    const productCategory = "Zusätzliches Angebot";
    const depot =
      depots.value.find((d) => d.id == item.depotId)?.name ||
      "Unbekanntes Depot";
    if (!dataByDepotAndProductCategory[depot]) {
      dataByDepotAndProductCategory[depot] = {};
    }
    if (!dataByDepotAndProductCategory[depot][productCategory]) {
      dataByDepotAndProductCategory[depot][productCategory] = [];
    }
    const description = item.description ? item.description : "";
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${item.product}${item.isBio ? " [BIO]" : ""}`,
      Einheit: getLangUnit(item.unit),
      Menge: item.totalShipedQuantity,
      Bemerkung: `${description}`,
    });
  }
  const zip = new JSZip();
  const depotKeys = Object.keys(dataByDepotAndProductCategory);
  for (let depotKey of depotKeys) {
    const dataByProductCategory = dataByDepotAndProductCategory[depotKey];
    let description = `Lieferschein für ${format(savedShipment.value.validFrom, "dd.MM.yyyy")}`;
    if (savedShipment.value.description) {
      description += `\n\n${savedShipment.value.description}`;
    }
    const pdf = generatePdf(dataByProductCategory, depotKey, description);
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    zip.file(`${sanitizeFileName(depotKey)}.pdf`, blob, { binary: true });
  }
  zip.generateAsync({ type: "blob" }).then((content) => {
    const blob = new Blob([content], { type: "zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipments-${format(savedShipment.value.validFrom, "yyyy-MM-dd")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    loading.value = false;
  });
};

const onShipmentOverviewPdfClick = async () => {
  if (!savedShipment?.value) {
    return;
  }
  loading.value = true;
  const dataByDepotAndProductCategory: {
    [key: string]: {
      [key: string]: {
        Bezeichnung: string;
        Menge: number;
      }[];
    };
  } = {};
  for (let item of savedShipment.value.shipmentItems) {
    const depot =
      depots.value.find((d) => d.id == item.depotId)?.name ||
      "Unbekanntes Depot";
    const product = productsById.value[item.productId];
    const productCategory =
      productCategories.value.find((pc) => pc.id == product.productCategoryId)
        ?.name || "Unbekannte Kategorie";
    if (!dataByDepotAndProductCategory[depot]) {
      dataByDepotAndProductCategory[depot] = {};
    }
    if (!dataByDepotAndProductCategory[depot][productCategory]) {
      dataByDepotAndProductCategory[depot][productCategory] = [];
    }
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${product.name}${item.isBio ? " [BIO]" : ""} [${getLangUnit(item.unit)}]`,
      Menge: item.totalShipedQuantity,
    });
  }
  for (let item of savedShipment.value.additionalShipmentItems) {
    const productCategory = "Zusätzliches Angebot";
    const depot =
      depots.value.find((d) => d.id == item.depotId)?.name ||
      "Unbekanntes Depot";
    if (!dataByDepotAndProductCategory[depot]) {
      dataByDepotAndProductCategory[depot] = {};
    }
    if (!dataByDepotAndProductCategory[depot][productCategory]) {
      dataByDepotAndProductCategory[depot][productCategory] = [];
    }
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${item.product}${item.isBio ? " [BIO]" : ""} [${getLangUnit(item.unit)}]`,
      Menge: item.totalShipedQuantity,
    });
  }
  const dataByProductCategoryAndProduct: {
    [key: string]: { [key: string]: { [key: string]: number } };
  } = {};
  const depotKeys = Object.keys(dataByDepotAndProductCategory);
  for (let depotKey of depotKeys) {
    const productCategoryKeys = Object.keys(
      dataByDepotAndProductCategory[depotKey],
    );
    for (let productCategoryKey of productCategoryKeys) {
      const data = dataByDepotAndProductCategory[depotKey][productCategoryKey];
      if (!dataByProductCategoryAndProduct[productCategoryKey]) {
        dataByProductCategoryAndProduct[productCategoryKey] = {};
      }
      for (let item of data) {
        if (
          !dataByProductCategoryAndProduct[productCategoryKey][item.Bezeichnung]
        ) {
          dataByProductCategoryAndProduct[productCategoryKey][
            item.Bezeichnung
          ] = { Summe: 0 };
        }
        dataByProductCategoryAndProduct[productCategoryKey][item.Bezeichnung][
          depotKey
        ] = item.Menge;
        dataByProductCategoryAndProduct[productCategoryKey][
          item.Bezeichnung
        ].Summe += item.Menge;
      }
    }
  }
  const zip = new JSZip();
  const productCategoryKeys = Object.keys(dataByProductCategoryAndProduct);
  for (let productCategoryKey of productCategoryKeys) {
    const dataByProduct = dataByProductCategoryAndProduct[productCategoryKey];
    let description = `Übersicht für ${productCategoryKey} vom ${format(savedShipment.value.validFrom, "dd.MM.yyyy")}`;
    const pdf = generateOverviewPdf(dataByProduct, description);
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    zip.file(`${sanitizeFileName(productCategoryKey)}.pdf`, blob, {
      binary: true,
    });
  }
  zip.generateAsync({ type: "blob" }).then((content) => {
    const blob = new Blob([content], { type: "zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overview-${format(savedShipment.value.validFrom, "yyyy-MM-dd")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    loading.value = false;
  });
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        {{ t.title }} KW {{ getISOWeek(editShipment.validFrom).toString() }}
      </v-card-title>
      <v-card-text>
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
              label="aktive"
              v-model="editShipment.active"
            ></v-checkbox>
          </v-col>
        </v-row>
        <v-list class="ma-0 pa-0">
          <template v-for="(item, idx) in editShipment.shipmentItems">
            <v-list-item class="ma-0 pa-0" v-if="item.showItem">
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
        <v-list class="ma-0 pa-0">
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
        <v-btn @click="onAddShipmentItem"> Produkt </v-btn>
        <v-btn @click="onAddAdditionalShipmentItem"> Zusatz </v-btn>
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
  <v-snackbar
    :model-value="!!error"
    color="red"
    @update:model-value="() => (error = undefined)"
  >
    {{ error }}
  </v-snackbar>
</template>
