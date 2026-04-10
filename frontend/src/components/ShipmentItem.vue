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
import { computed, ref, watch } from "vue";
import { EditShipmentItem } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { useConfigStore } from "../store/configStore";
import { useBIStore } from "../store/biStore";
import { storeToRefs } from "pinia";
import { valueToDelivered } from "../lib/convert";
import { unitDict, multiplicatorOptions } from "../lib/options";
import { getLangUnit } from "@lebenswurzel/solawi-bedarf-shared/src/util/unitHelper.ts";

const props = defineProps<{
  shipmentItem: EditShipmentItem;
  usedDepotIdsByProductId: { [key: number]: number[] };
  isForecast: boolean;
}>();

const biStore = useBIStore();
const configStore = useConfigStore();
const {
  productsById,
  requiredByProductIdDepotId,
  soldByProductId,
  deliveredByProductIdDepotId,
} = storeToRefs(biStore);
const { depots } = storeToRefs(configStore);

const open = ref<boolean>(false);
const isDifferentQuantity = ref<boolean>(false);

const productOptions = computed(() => {
  const keys = Object.keys(soldByProductId.value)
    .map((k) => parseInt(k))
    .filter((k) => soldByProductId.value[k].soldForShipment > 0);
  return Object.values(productsById.value)
    .filter((p) => keys.includes(p.id))
    .map((p) => ({
      title: p.name,
      value: p.id,
    }));
});

const neededQuantity = computed(() => {
  if (props.shipmentItem.productId) {
    const requiredByDepotId =
      requiredByProductIdDepotId.value[props.shipmentItem.productId];
    if (requiredByDepotId) {
      const valueForShipment = props.shipmentItem.depotIds.reduce(
        (acc, cur) => acc + requiredByDepotId[cur]?.valueForShipment || 0,
        0,
      );
      const { multiplicator, conversionFrom, conversionTo } =
        props.shipmentItem;
      const needed = valueToDelivered({
        value: valueForShipment,
        multiplicator,
        conversionFrom,
        conversionTo,
      });
      if (props.isForecast) {
        // for forecast shipments, automatically match the total shipped quanitity with the needed quantity
        props.shipmentItem.totalShipedQuantity = needed;
      }
      return needed;
    }
  }
  return 0;
});

watch([neededQuantity, isDifferentQuantity], () => {
  if (!isDifferentQuantity.value) {
    props.shipmentItem.totalShipedQuantity = neededQuantity.value;
  }
});

const unitOptions = computed(() => {
  if (props.shipmentItem.productId) {
    return unitDict[productsById.value[props.shipmentItem.productId].unit];
  }
});

const getAvailableDepotsForProduct = (productId?: number) => {
  if (!productId) {
    return [];
  }
  const requiredByDepotId = requiredByProductIdDepotId.value[productId];
  const deliveredByDepotId = deliveredByProductIdDepotId.value[productId] ?? {};
  const usedDepotIds = props.usedDepotIdsByProductId[productId];
  if (requiredByDepotId) {
    const depotIds = Object.keys(requiredByDepotId).map((key) => parseInt(key));
    return depots.value
      .filter((d) => depotIds.includes(d.id))
      .filter(
        (d) =>
          !usedDepotIds.includes(d.id) ||
          props.shipmentItem.depotIds.includes(d.id),
      )
      .filter((d) => requiredByDepotId[d.id].valueForShipment > 0)
      .sort((a, b) => a.rank - b.rank)
      .map((d) => ({
        depot: d,
        delivered: { ...requiredByDepotId[d.id], ...deliveredByDepotId[d.id] },
      }));
  }
};

const depotOptions = computed(() => {
  const getDeliveredValue = (value: number | undefined) => {
    // check for NaN
    if (isNaN(value || 0)) {
      return 0;
    }
    return value || 0;
  };
  return getAvailableDepotsForProduct(props.shipmentItem.productId)?.map(
    (dd) => ({
      title: `${dd.depot.name} (${(getDeliveredValue(dd.delivered.actuallyDelivered) + getDeliveredValue(dd.delivered.assumedDelivered)) / 100}/${
        dd.delivered.frequency
      })`,
      value: dd.depot.id,
    }),
  );
});

const onProductIdChange = (val: number) => {
  props.shipmentItem.productId = val;
  props.shipmentItem.unit =
    productsById.value[props.shipmentItem.productId].unit;
  props.shipmentItem.depotIds = [];
  props.shipmentItem.conversionFrom = 1;
  props.shipmentItem.conversionTo = 1;
  props.shipmentItem.multiplicator = 100;
  props.shipmentItem.totalShipedQuantity = 0;
  props.shipmentItem.isBio = false;
  props.shipmentItem.description = null;
};

const onSelectAllDepots = () => {
  if (selectAllDepots.value) {
    props.shipmentItem.depotIds = [];
  } else {
    props.shipmentItem.depotIds =
      getAvailableDepotsForProduct(props.shipmentItem.productId)?.map(
        (dd) => dd.depot.id,
      ) || [];
  }
};

const selectAllDepots = computed(() => {
  const value = getAvailableDepotsForProduct(props.shipmentItem.productId)?.map(
    (dd) => dd.depot.id,
  );
  return value?.length == props.shipmentItem.depotIds.length;
});
</script>

<template>
  <v-container class="px-0 pt-0 pb-4 ma-0" fluid>
    <v-row no-gutters align="center" justify="center" class="pa-0 ma-0">
      <v-col :cols="props.isForecast ? 4 : 3">
        <v-autocomplete
          label="Produkt"
          :items="productOptions"
          :model-value="shipmentItem.productId"
          @update:model-value="onProductIdChange"
          :hide-details="true"
        ></v-autocomplete>
      </v-col>
      <v-col cols="3">
        <v-select
          label="Depots"
          :items="depotOptions"
          v-model="shipmentItem.depotIds"
          multiple
          :hide-details="true"
        >
          <template v-slot:prepend-item v-if="(depotOptions?.length || 0) > 1">
            <v-list-item title="Alle auswählen" @click="onSelectAllDepots">
              <template v-slot:prepend>
                <v-checkbox-btn :model-value="selectAllDepots"></v-checkbox-btn>
              </template>
            </v-list-item>

            <v-divider class="mt-2"></v-divider>
          </template>
        </v-select>
      </v-col>
      <v-col :cols="props.isForecast ? 2 : 3">
        <div
          class="shipment-item-needed-delivered d-flex flex-row ga-0 align-center w-100"
        >
          <v-text-field
            class="flex-1-1-0"
            :label="`Benötigt [${getLangUnit(shipmentItem.unit)}]`"
            @update:model-value="() => {}"
            :model-value="neededQuantity"
            :hide-details="true"
          ></v-text-field>
          <v-text-field
            v-if="!props.isForecast"
            class="flex-1-1-0"
            :label="`Geliefert [${getLangUnit(shipmentItem.unit)}]`"
            v-model="shipmentItem.totalShipedQuantity"
            type="number"
            :disabled="!isDifferentQuantity"
            :hide-details="true"
          >
            <template
              v-slot:append-inner
              v-if="shipmentItem.totalShipedQuantity != neededQuantity"
            >
              <v-tooltip
                text="Es wird eine abweichende Menge geliefert"
                open-on-click
              >
                <template v-slot:activator="{ props }">
                  <v-icon color="orange" v-bind="props">mdi-alert</v-icon>
                </template>
              </v-tooltip>
            </template>
          </v-text-field>
        </div>
      </v-col>
      <template v-if="!props.isForecast">
        <v-col cols="3">
          <div class="d-flex flex-row align-start ga-2">
            <div
              class="text-label-medium shipment-item-checkboxes d-flex flex-column ga-0 flex-grow-1"
            >
              <v-checkbox
                v-model="isDifferentQuantity"
                label="abweichende Liefermenge"
                density="compact"
                :hide-details="true"
              >
              </v-checkbox>
              <v-checkbox
                label="Bio"
                v-model="shipmentItem.isBio"
                density="compact"
                :hide-details="true"
              ></v-checkbox>
            </div>
            <v-btn
              class="flex-shrink-0 align-self-center"
              variant="outlined"
              @click="() => (open = !open)"
              density="compact"
            >
              <v-icon v-if="!open"> mdi-arrow-expand-down</v-icon>
              <v-icon v-if="open"> mdi-arrow-collapse-up</v-icon>
            </v-btn>
          </div>
        </v-col>
      </template>
      <template v-else>
        <v-col cols="2">
          <v-select
            label="Multiplikator"
            :items="multiplicatorOptions"
            v-model="shipmentItem.multiplicator"
            :hide-details="true"
          ></v-select>
        </v-col>
      </template>
    </v-row>
    <v-row
      no-gutters
      align="center"
      justify="center"
      v-if="open"
      class="pa-0 ma-0"
    >
      <v-col cols="4">
        <v-text-field
          label="Beschreibung"
          v-model="shipmentItem.description"
          clearable
          :hide-details="true"
        ></v-text-field>
      </v-col>
      <v-col cols="2">
        <v-select
          label="Multiplikator"
          :items="multiplicatorOptions"
          v-model="shipmentItem.multiplicator"
          :hide-details="true"
        ></v-select>
      </v-col>
      <v-col cols="2">
        <v-text-field
          label="von"
          v-model="shipmentItem.conversionFrom"
          type="number"
          :hide-details="true"
        />
      </v-col>
      <v-col cols="2">
        <v-select
          label="Einheit"
          :items="unitOptions"
          v-model="shipmentItem.unit"
          :hide-details="true"
        ></v-select>
      </v-col>
      <v-col cols="2">
        <v-text-field
          label="nach"
          v-model="shipmentItem.conversionTo"
          type="number"
          :hide-details="true"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Equal-width Benötigt / Geliefert fields in a flex row */
.shipment-item-needed-delivered > * {
  min-width: 0;
}

/* Allow long checkbox labels to shrink/wrap beside the expand button in a flex row. */
.shipment-item-checkboxes {
  min-width: 0;
}

/* Compact checkboxes: VCheckbox ties row height to --v-input-control-height (40px for density compact). */
.shipment-item-checkboxes :deep(.v-input) {
  --v-input-control-height: 24px;
}

.shipment-item-checkboxes :deep(.v-selection-control) {
  --v-selection-control-size: 20px;
}

.shipment-item-checkboxes :deep(.v-selection-control .v-icon) {
  font-size: 18px;
}
</style>
