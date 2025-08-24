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
import { computed, ref, watchEffect } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { useConfigStore } from "../store/configStore.ts";

const open = ref(false);
const buttonRef = ref<Element>();
const newSeasonHintConfirmed = ref<boolean>(
  localStorage.getItem("newSeasonHintConfirmed") === "true",
);
const loading = ref(false);
const t = language.components.seasonSelector;
const configStore = useConfigStore();

const {
  availableConfigs,
  config,
  seasonColorClass,
  activeConfigId,
  showSeasonSelectorHint,
} = storeToRefs(configStore);

const selectedConfig = ref<number | undefined>(activeConfigId.value);

const configOptions = computed(() => {
  return availableConfigs.value.map((config) => ({
    title: config.name + (config.public ? "" : " (unveröffentlicht)"),
    value: config.id,
  }));
});

const selectionAvailable = computed(() => {
  return availableConfigs.value.length > 1;
});

watchEffect(() => {
  selectedConfig.value = config.value?.id;
});

const onApply = async () => {
  loading.value = true;
  try {
    await configStore.update(selectedConfig.value);
    location.reload();
  } finally {
    loading.value = false;
  }
  open.value = false;
};

const onCancel = () => {
  open.value = false;
};

const openDialog = () => {
  open.value = true;
};

const onConfirmTooltip = () => {
  newSeasonHintConfirmed.value = true;
  localStorage.setItem("newSeasonHintConfirmed", "true");
};

const showNewSeasonHint = computed(() => {
  return !newSeasonHintConfirmed.value && showSeasonSelectorHint.value;
});
</script>

<template>
  <v-btn
    ref="buttonRef"
    class="pa-2 season-indicator rounded-lg"
    :class="[seasonColorClass, { 'shake-animation': showNewSeasonHint }]"
    @click="openDialog"
    :prepend-icon="config?.public ? '' : 'mdi-eye-off-outline'"
  >
    {{ config?.name || "Saison ?" }}
  </v-btn>

  <v-overlay
    v-bind:modelValue="showNewSeasonHint"
    :activator="buttonRef"
    location-strategy="connected"
    location="bottom"
    scroll-strategy="block"
    persistent
    :openOnClick="false"
  >
    <v-card
      variant="elevated"
      color="info"
      max-width="300"
      prepend-icon="mdi-information"
      title="Hinweis"
    >
      <v-card-text>
        Über diesen Schalter kann die Ansicht zwischen der aktuellen und der
        nächsten Saison umgeschaltet werden.
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn variant="elevated" color="primary" @click="onConfirmTooltip"
          >Verstanden</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-overlay>

  <v-dialog
    :model-value="open"
    @update:model-value="onCancel"
    style="max-width: 800px"
  >
    <v-card variant="elevated">
      <v-card-title class="text-center">{{
        language.components.seasonSelector.label
      }}</v-card-title>
      <v-card-text class="text-medium-emphasis">
        {{
          selectionAvailable
            ? language.components.seasonSelector.description
            : language.components.seasonSelector.notYetAvailable
        }}
      </v-card-text>
      <v-card-text class="enclosing" v-if="selectionAvailable">
        <v-select
          :label="t.label"
          :items="configOptions"
          v-model="selectedConfig"
          ant="solo-filled"
          density="compact"
        />
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn @click="onCancel" variant="outlined" color="secondary">
          {{
            selectionAvailable
              ? language.app.actions.cancel
              : language.app.actions.close
          }}
        </v-btn>
        <v-btn
          @click="onApply"
          :loading="loading"
          variant="elevated"
          v-if="selectionAvailable"
        >
          {{ language.app.actions.apply }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
