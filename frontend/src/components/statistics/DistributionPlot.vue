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
import { computed } from "vue";

export type DistributionDataItem = {
  value: number;
  label: string;
};
export type DistributionData = {
  items: DistributionDataItem[];
};

const props = defineProps<{
  distributionData: DistributionData;
  fixedDigits?: number;
}>();

const maxValue = computed(() => {
  return Math.max(...props.distributionData.items.map((v) => v.value));
});

const toFixedValue = (value: number) => {
  return props.fixedDigits ? value.toFixed(props.fixedDigits) : value;
};
</script>

<template>
  <div class="text-subtitle-2 opacity-60">
    Anzahl:
    {{
      toFixedValue(
        props.distributionData.items.reduce((acc, item) => acc + item.value, 0),
      )
    }}
  </div>
  <table class="w-100">
    <tbody>
      <tr v-for="item in props.distributionData.items">
        <td class="pr-2">
          {{ toFixedValue(item.value) }}
        </td>
        <td class="w-100">
          <v-progress-linear
            height="30"
            :model-value="item.value"
            :max="maxValue"
            color="secondary"
          >
            {{ item.label }}
          </v-progress-linear>
        </td>
      </tr>
    </tbody>
  </table>
</template>
