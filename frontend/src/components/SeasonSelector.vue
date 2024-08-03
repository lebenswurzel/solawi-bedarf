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
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { language } from "../lang/lang.ts";
import { useConfigStore } from "../store/configStore.ts";

const t = language.components.seasonSelector;
const configStore = useConfigStore();

const { availableConfigs, config } = storeToRefs(configStore);

const configOptions = computed(() => {
  return availableConfigs.value.map((config) => ({
    title: config.name,
    value: config.id,
  }));
});

const onConfigChanged = async (id: number) => {
  await configStore.update(id);
};
</script>

<template>
  <v-card-text>
    <v-select
      :label="t.label"
      :items="configOptions"
      :model-value="config?.id"
      @update:model-value="onConfigChanged"
    />
  </v-card-text>
</template>
