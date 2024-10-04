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
import { useConfigStore } from "../store/configStore";
import { language } from "../lang/lang";
import { dateToString, stringToDate } from "../lib/convert";

defineProps(["open"]);
const emit = defineEmits(["close"]);
const onClose = () => {
  emit("close");
};

const t = language.pages.config;

const configStore = useConfigStore();
const newSeasonName = ref<string>("");
const newSeasonStartDate = ref<Date>(
  new Date(new Date().getFullYear() + 1, 3, 1),
);
const copyFromSeasonId = ref<number | undefined>();
const onConfirmCreate = () => {
  copyFromSeasonId.value = undefined;
  newSeasonName.value = "";
  console.log(
    "CREATE",
    copyFromSeasonId.value,
    newSeasonName.value,
    newSeasonStartDate.value,
  );
  onClose();
};

const configOptions = computed(() => {
  return configStore.availableConfigs.map((config) => ({
    title: config.name,
    value: config.id,
  }));
});
</script>
<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>{{ t.newSeason.title }}</v-card-title>
      <v-card-text>
        <v-text-field
          :label="t.name"
          type="text"
          v-model="newSeasonName"
        ></v-text-field>
        <v-select
          :label="t.newSeason.copyFromPrevious"
          :items="configOptions"
          v-model="copyFromSeasonId"
        ></v-select>
        <v-text-field
          :label="t.validFrom"
          type="datetime-local"
          :model-value="dateToString(newSeasonStartDate)"
          @update:model-value="
            (val: string) =>
              (newSeasonStartDate = stringToDate(val) || newSeasonStartDate)
          "
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onConfirmCreate">{{ language.app.actions.apply }}</v-btn>
        <v-btn color="error" @click="onClose">{{
          language.app.actions.cancel
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
