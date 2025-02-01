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

const props = defineProps<{ distributionData: DistributionData }>();

const maxValue = computed(() => {
  return Math.max(...props.distributionData.items.map((v) => v.value));
});
</script>

<template>
  <table class="w-100">
    <tbody>
      <tr v-for="item in props.distributionData.items">
        <td class="pr-2">
          {{ item.value }}
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
