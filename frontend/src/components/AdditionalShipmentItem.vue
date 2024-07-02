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
import { EditAdditionalShipmentItem } from "../../../shared/src/types";
import { Unit } from "../../../shared/src/enum";
import { useConfigStore } from "../store/configStore";
import { storeToRefs } from "pinia";
import { useBIStore } from "../store/biStore";
import { computed } from "vue";

const props = defineProps<{
  additionalShipmentItem: EditAdditionalShipmentItem;
  usedDepotIdsByProduct: { [key: string]: number[] };
}>();

const biStore = useBIStore();
const configStore = useConfigStore();
const { capacityByDepotId } = storeToRefs(biStore);
const { depots } = storeToRefs(configStore);

const depotOptions = computed(() => {
  if (props.additionalShipmentItem.product?.trim()) {
    const usedDepotIds =
      props.usedDepotIdsByProduct[props.additionalShipmentItem.product.trim()];
    return depots.value
      .filter(
        (d) =>
          !usedDepotIds.includes(d.id) ||
          props.additionalShipmentItem.depotIds.includes(d.id),
      )
      .map((d) => ({
        title: `${d.name} (${capacityByDepotId.value[d.id].reserved})`,
        value: d.id,
      }));
  }
});

const unitOptions = [
  {
    title: "Stk",
    value: Unit.PIECE,
  },
  {
    title: " ml",
    value: Unit.VOLUME,
  },
  {
    title: "g",
    value: Unit.WEIGHT,
  },
];

const onProductChange = (val: string) => {
  props.additionalShipmentItem.product = val;
  props.additionalShipmentItem.depotIds = [];
};
</script>

<template>
  <v-container class="pa-0 ma-0">
    <v-row no-gutters align="center" justify="center" class="pa-0 ma-0">
      <v-col cols="2">
        <v-text-field
          label="Produkt"
          :model-value="additionalShipmentItem.product"
          @update:model-value="onProductChange"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-select
          label="Depots"
          :items="depotOptions"
          v-model="additionalShipmentItem.depotIds"
          multiple
        ></v-select>
      </v-col>
      <v-col cols="1">
        <v-select
          label="Einheit"
          :items="unitOptions"
          v-model="additionalShipmentItem.unit"
        ></v-select>
      </v-col>
      <v-col cols="2">
        <v-text-field
          label="Menge/ET"
          v-model="additionalShipmentItem.quantity"
          type="number"
        />
      </v-col>
      <v-col cols="2">
        <v-text-field
          label="Gelieferte Menge"
          v-model="additionalShipmentItem.totalShipedQuantity"
          type="number"
        />
      </v-col>
      <v-col cols="1">
        <v-checkbox
          label="isBio"
          v-model="additionalShipmentItem.isBio"
        ></v-checkbox>
      </v-col>
      <v-col cols="12">
        <v-text-field
          label="Beschreibung"
          v-model="additionalShipmentItem.description"
          clearable
        ></v-text-field>
      </v-col>
    </v-row>
  </v-container>
</template>
