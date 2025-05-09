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
import { computed, onMounted, ref, watch } from "vue";
import { useConfigStore } from "../store/configStore";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { dateToString, stringToDate } from "../lib/convert";
import { createConfig } from "../requests/config";
import { NewConfig } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { addDays, addMonths, addYears } from "date-fns";
import { useUiFeedback } from "../store/uiFeedbackStore";

defineProps(["open"]);
const emit = defineEmits(["close"]);
const onClose = () => {
  emit("close");
};

const t = language.pages.config;

const configStore = useConfigStore();
const { setError, setSuccess } = useUiFeedback();
const newSeasonName = ref<string>("");
const newSeasonStartDate = ref<Date>(
  new Date(new Date().getFullYear() + 1, 3, 1),
);
const copyFromSeasonId = ref<number | undefined>();
const isValid = ref<boolean>(false);
const onConfirmCreate = async () => {
  if (!isValid.value) {
    return;
  }

  const newConfig: NewConfig = {
    name: newSeasonName.value,
    validFrom: newSeasonStartDate.value,
    validTo: addDays(addYears(newSeasonStartDate.value, 1), -1),
    startOrder: addMonths(newSeasonStartDate.value, -5),
    startBiddingRound: addMonths(newSeasonStartDate.value, -2),
    endBiddingRound: addMonths(newSeasonStartDate.value, -1),
    budget: 0,
    public: false,
  };

  try {
    await createConfig({ config: newConfig, copyFrom: copyFromSeasonId.value });
    setSuccess("Erstellung erfolgreich");
    configStore.update();
  } catch (e) {
    setError("Erstellung fehlgeschlagen", e as Error);
    throw e;
  }

  onClose();
};

watch(configStore, () => {
  copyFromSeasonId.value = configStore.activeConfigId;
});
onMounted(() => {
  copyFromSeasonId.value = configStore.activeConfigId;
});

const newSeasonNameRules = [
  (value: string) => {
    if (!value) return "Name darf nicht leer sein";
    return true;
  },
  (value: string) => {
    if (configStore.availableConfigs.map((v) => v.name).includes(value)) {
      return "Es existiert bereits eine Saison mit dieser Bezeichnung";
    }
    return true;
  },
];

const configOptions = computed(() => {
  return configStore.availableConfigs.map((config) => ({
    title: config.name,
    value: config.id,
  }));
});
</script>
<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-form v-model="isValid" @submit="onConfirmCreate" @submit.prevent>
      <v-card>
        <v-card-title>{{ t.newSeason.title }}</v-card-title>
        <v-card-text>
          <v-text-field
            :label="t.name"
            :rules="newSeasonNameRules"
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
          <v-btn type="submit">{{ language.app.actions.apply }}</v-btn>
          <v-btn color="error" @click="onClose">{{
            language.app.actions.cancel
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
