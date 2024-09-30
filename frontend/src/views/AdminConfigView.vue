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
import { saveConfig } from "../requests/config.ts";
import { stringToDate, dateToString } from "../lib/convert.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
const t = language.pages.config;

const loading = ref(false);
const configStore = useConfigStore();

const startOrder = ref<Date>(new Date());
const endBiddingRound = ref<Date>(new Date());
const startBiddingRound = ref<Date>(new Date());
const validFrom = ref<Date>(new Date());
const validTo = ref<Date>(new Date());
const budget = ref<number>(0);
const { setError, setSuccess } = useUiFeedback();

onMounted(async () => {
  await configStore.update();
  const orderConfig = configStore.config;
  startOrder.value = orderConfig?.startOrder || new Date();
  endBiddingRound.value = orderConfig?.endBiddingRound || new Date();
  startBiddingRound.value = orderConfig?.startBiddingRound || new Date();
  budget.value = orderConfig?.budget || 0;
  validFrom.value = orderConfig?.validFrom || new Date();
  validTo.value = orderConfig?.validTo || new Date();
});

const onSave = () => {
  loading.value = true;
  saveConfig({
    startOrder: startOrder.value,
    endBiddingRound: endBiddingRound.value,
    startBiddingRound: startBiddingRound.value,
    budget: budget.value,
    validFrom: validFrom.value,
    validTo: validTo.value,
    name: "not used",
  })
    .then(async () => {
      configStore
        .update()
        .then(() => {
          setSuccess(language.app.uiFeedback.saving.success);
        })
        .catch((e: Error) => {
          setError(language.app.uiFeedback.saving.failed + ": " + e.message);
        });
    })
    .catch((e: Error) => {
      setError(language.app.uiFeedback.saving.failed + ": " + e.message);
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> {{ t.title }} </v-card-title>
    <v-card-subtitle>{{ t.subtitle }}</v-card-subtitle>
    <v-card-text>
      <v-text-field
        :label="t.validFrom"
        type="datetime-local"
        :model-value="dateToString(validFrom)"
        @update:model-value="
          (val: string) => (validFrom = stringToDate(val) || validFrom)
        "
      ></v-text-field>
      <v-text-field
        :label="t.validTo"
        type="datetime-local"
        :model-value="dateToString(validTo)"
        @update:model-value="
          (val: string) => (validTo = stringToDate(val) || validTo)
        "
      ></v-text-field>
      <v-text-field
        :label="t.startOrder"
        type="datetime-local"
        :model-value="dateToString(startOrder)"
        @update:model-value="
          (val: string) => (startOrder = stringToDate(val) || startOrder)
        "
      ></v-text-field>
      <v-text-field
        :label="t.startBiddingRound"
        type="datetime-local"
        :model-value="dateToString(startBiddingRound)"
        @update:model-value="
          (val: string) =>
            (startBiddingRound = stringToDate(val) || startBiddingRound)
        "
      ></v-text-field>
      <v-text-field
        :label="t.endBiddingRound"
        type="datetime-local"
        :model-value="dateToString(endBiddingRound)"
        @update:model-value="
          (val: string) =>
            (endBiddingRound = stringToDate(val) || endBiddingRound)
        "
      ></v-text-field>
      <v-text-field
        :label="t.budget"
        type="number"
        v-model="budget"
      ></v-text-field>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onSave" :loading="loading">{{
        language.app.actions.save
      }}</v-btn>
    </v-card-actions>
  </v-card>
</template>
: string: string: string: string: string: string: string: string
