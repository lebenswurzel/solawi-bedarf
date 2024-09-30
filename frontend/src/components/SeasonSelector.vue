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
import { computed, onMounted, ref } from "vue";
import { language } from "../lang/lang.ts";
import { useConfigStore } from "../store/configStore.ts";

const open = ref(false);
const t = language.components.seasonSelector;
const configStore = useConfigStore();

const { availableConfigs, config, seasonColorClass } = storeToRefs(configStore);

const selectedConfig = ref<number | undefined>(config.value?.id);

const configOptions = computed(() => {
  return availableConfigs.value.map((config) => ({
    title: config.name,
    value: config.id,
  }));
});

onMounted(async () => {
  await configStore.update();
  selectedConfig.value = config.value?.id;
});

const onApply = async () => {
  await configStore.update(selectedConfig.value);
  open.value = false;
};

const onCancel = () => {
  open.value = false;
};

const openDialog = () => {
  open.value = true;
};
</script>

<template>
  <v-btn
    class="pa-2 season-indicator rounded-lg"
    :class="seasonColorClass"
    @click="openDialog"
    >{{ config?.name || "Saison ?" }}</v-btn
  >

  <v-dialog :model-value="open" @update:model-value="onCancel">
    <v-card>
      <v-card-title class="text-center">{{
        language.components.seasonSelector.label
      }}</v-card-title>
      <v-card-subtitle>
        {{ language.components.seasonSelector.description }}
      </v-card-subtitle>
      <v-card-text class="enclosing">
        <v-select
          :label="t.label"
          :items="configOptions"
          v-model="selectedConfig"
          ant="solo-filled"
          density="compact"
        />
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn @click="onApply" variant="elevated">
          {{ language.app.actions.apply }}
        </v-btn>
        <v-btn @click="onCancel" variant="elevated" color="error">
          {{ language.app.actions.cancel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
