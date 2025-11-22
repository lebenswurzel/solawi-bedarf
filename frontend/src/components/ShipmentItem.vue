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
import { computed, ref } from "vue";
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
  const deliveredByDepotId = deliveredByProductIdDepotId.value[productId];
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
  return getAvailableDepotsForProduct(props.shipmentItem.productId)?.map(
    (dd) => ({
      title: `${dd.depot.name} (${((dd.delivered.actuallyDelivered || 0) + dd.delivered.assumedDelivered) / 100}/${
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
  <v-container class="pa-0 ma-0" fluid>
    <v-row no-gutters align="center" justify="center" class="pa-0 ma-0">
      <v-col :cols="props.isForecast ? 4 : 2">
        <v-autocomplete
          label="Produkt"
          :items="productOptions"
          :model-value="shipmentItem.productId"
          @update:model-value="onProductIdChange"
        ></v-autocomplete>
      </v-col>
      <v-col cols="4">
        <v-select
          label="Depots"
          :items="depotOptions"
          v-model="shipmentItem.depotIds"
          multiple
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
      <v-col :cols="props.isForecast ? 2 : 1">
        <v-text-field
          :label="`Benötigt [${getLangUnit(shipmentItem.unit)}]`"
          @update:model-value="() => {}"
          :model-value="neededQuantity"
        ></v-text-field>
      </v-col>
      <template v-if="!props.isForecast">
        <v-col cols="2">
          <v-text-field
            :label="`Geliefert [${getLangUnit(shipmentItem.unit)}]`"
            v-model="shipmentItem.totalShipedQuantity"
            type="number"
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
        </v-col>
        <v-col cols="2">
          <v-checkbox label="isBio" v-model="shipmentItem.isBio"></v-checkbox>
        </v-col>
        <v-col cols="1">
          <v-btn variant="outlined" @click="() => (open = !open)">
            <v-icon v-if="!open"> mdi-arrow-expand-down</v-icon>
            <v-icon v-if="open"> mdi-arrow-collapse-up</v-icon>
          </v-btn>
        </v-col>
      </template>
      <template v-else>
        <v-col cols="2">
          <v-select
            label="Multiplikator"
            :items="multiplicatorOptions"
            v-model="shipmentItem.multiplicator"
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
        ></v-text-field>
      </v-col>
      <v-col cols="2">
        <v-select
          label="Multiplikator"
          :items="multiplicatorOptions"
          v-model="shipmentItem.multiplicator"
        ></v-select>
      </v-col>
      <v-col cols="2">
        <v-text-field
          label="von"
          v-model="shipmentItem.conversionFrom"
          type="number"
        />
      </v-col>
      <v-col cols="2">
        <v-select
          label="Einheit"
          :items="unitOptions"
          v-model="shipmentItem.unit"
        ></v-select>
      </v-col>
      <v-col cols="2">
        <v-text-field
          label="nach"
          v-model="shipmentItem.conversionTo"
          type="number"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
