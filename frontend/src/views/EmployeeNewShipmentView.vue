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
import { computed, onMounted, ref } from "vue";
import { useBIStore } from "../store/biStore.ts";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import {
  Id,
  Product,
  Shipment,
  ShipmentItem,
} from "../../../shared/src/types.ts";
import { getShipments } from "../requests/shipment.ts";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import {
  byKey,
  grouping,
  inLocaleOrder,
  inNaturalOrder,
  nullsFirst,
} from "../../../shared/src/util/utils.ts";
import { multiplicatorOptions } from "../lib/options.ts";
import { getLangUnit } from "../../../shared/src/util/unitHelper.ts";
import { language } from "../../../shared/src/lang/lang.ts";
import { interpolate } from "../../../shared/src/lang/template.ts";
import { getISOWeek } from "date-fns";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";

const t = language.pages.singleShipment;

const shipment = ref<Shipment & Id>();

const biStore = useBIStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const { productsById } = storeToRefs(biStore);
const { depots, activeConfigId } = storeToRefs(configStore);

const { setError } = useUiFeedback();

const loading = ref(true);

const filterDepos = ref<number[]>([]);
const filterProducts = ref<number[]>([]);

const route = useRoute();

const depotsById = computed(() => {
  return depots.value.reduce(
    grouping(
      (d) => d.id,
      (d) => d.name,
    ),
    new Map(),
  );
});

const NUMBER_FORMAT = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

function formatNumber(v: number): string {
  return NUMBER_FORMAT.format(v);
}

function formatQuantityChange(item: ShipmentItem, product: Product): string {
  if (item.unit != product.unit || item.conversionFrom != item.conversionTo) {
    const mul = item.multiplicator / 100;
    return `${item.conversionFrom} ${getLangUnit(product.unit)} -> ${formatNumber(item.conversionTo * mul)} ${getLangUnit(item.unit)}`;
  } else {
    if (item.multiplicator != 100) {
      return (
        multiplicatorOptions.find((mo) => mo.value == item.multiplicator)
          ?.title ?? ""
      );
    } else {
      return "";
    }
  }
}

const headers = [
  {
    title: t.depo,
    key: "depotId",
    value: (item: ShipmentItem) => depotsById.value.get(item.depotId),
    sort: inLocaleOrder,
  },
  {
    title: t.product,
    key: "product",
    value: (item: ShipmentItem) => productsById.value[item.productId].name,
    sort: inLocaleOrder,
  },
  {
    title: t.bio,
    key: "bio",
    value: (item: ShipmentItem) => item.isBio,
    sortable: false,
  },
  {
    title: t.totalShipedQuantity,
    key: "totalShipedQuantity",
    value: (item: ShipmentItem) =>
      `${item.totalShipedQuantity} ${getLangUnit(item.unit)}`,
    sort: byKey(
      (item: ShipmentItem) => item.totalShipedQuantity,
      inNaturalOrder,
    ),
  },
  {
    title: t.description,
    key: "description",
    value: (item: ShipmentItem) => item.description,
    sort: nullsFirst(inLocaleOrder),
  },
  {
    title: t.quantityChange,
    key: "quantityChange",
    value: (item: ShipmentItem) =>
      formatQuantityChange(item, productsById.value[item.productId]),
    sortable: false,
  },
];

function parseId(id: string | string[]) {
  return Array.isArray(id) ? NaN : parseInt(id);
}

onMounted(async () => {
  await configStore.update();
  await productStore.update(activeConfigId.value);
  await biStore.update(activeConfigId.value);
  const shipmentId = parseId(route.params.shipmentId);

  const shipments = (await getShipments(activeConfigId.value, shipmentId, true))
    .shipments;

  if (shipments.length !== 1) {
    setError(`Keine Verteilung mit ID=${shipmentId} gefunden`);
    return;
  }

  shipment.value = shipments[0];
  loading.value = false;
});

const productItems = computed(() => {
  return Object.entries(productsById.value)
    .map(([id, value]) => ({
      name: value.name,
      value: id,
    }))
    .sort(byKey((x) => x.name, inLocaleOrder));
});

const filters = {
  depotId(_1: string, _2: string, item?: any) {
    const selected = filterDepos.value;
    return selected.length ? selected.includes(item.raw.depotId) : true;
  },
  product(_1: string, _2: string, item?: any) {
    const selected = filterProducts.value;
    return selected.length ? selected.includes(item.value) : true;
  },
};
</script>

<template>
  <v-card
    class="ma-2"
    :title="
      interpolate(t.title, {
        kw: shipment ? getISOWeek(shipment.validFrom).toString() : '…',
      })
    "
    :subtitle="shipment?.description ?? undefined"
    flat
  >
    <template v-slot:text>
      <v-row>
        <v-col cols="12" sm="6">
          <v-autocomplete
            :label="t.depo"
            :items="depots"
            item-title="name"
            item-value="id"
            variant="outlined"
            multiple
            clearable
            chips
            prepend-inner-icon="mdi-magnify"
            v-model="filterDepos"
          ></v-autocomplete>
        </v-col>
        <v-col cols="12" sm="6">
          <v-autocomplete
            :label="t.product"
            :items="productItems"
            item-title="name"
            variant="outlined"
            multiple
            clearable
            chips
            prepend-inner-icon="mdi-magnify"
            v-model="filterProducts"
          ></v-autocomplete>
        </v-col>
      </v-row>
    </template>

    <v-data-table
      :items="shipment?.shipmentItems"
      :headers="headers"
      :filter-keys="Object.keys(filters)"
      :custom-key-filter="filters"
      filter-mode="every"
      :search="JSON.stringify([filterDepos, filterProducts])"
      items-per-page="10"
      :loading="loading"
    >
      <template v-slot:item.bio="{ item }">
        <v-icon
          :icon="item.isBio ? 'mdi-leaf-circle-outline' : 'mdi-circle-outline'"
          class="mr-2"
        />
      </template>

      <template v-slot:loading>
        <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
      </template>
    </v-data-table>
  </v-card>
</template>
