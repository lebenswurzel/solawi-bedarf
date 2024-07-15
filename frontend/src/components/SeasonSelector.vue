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
import { onMounted } from "vue";
import { language } from "../lang/lang.ts";
import { useConfigStore } from "../store/configStore.ts";
import { ref } from "vue";

const t = language.components.seasonSelector;
const configStore = useConfigStore();

const configNames = ref<string[]>();
const configName = ref<string>();

onMounted(async () => {
  configNames.value = configStore.availableConfigs.map((v) => v.name);
  configName.value = configStore.config?.name || "Unknown";
});

configStore.$subscribe((_mutation, state) => {
  configNames.value = state.availableConfigs?.map((v) => v.name) || [];
  configName.value = configNames.value[0];
});

// TODO update config store on selection change
</script>

<template>
  <v-card-text>
    <v-select :label="t.label" :items="configNames" v-model="configName" />
  </v-card-text>
</template>
