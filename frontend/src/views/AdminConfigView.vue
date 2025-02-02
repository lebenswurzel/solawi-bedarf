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
import { onMounted, watch } from "vue";
import { language } from "../../../shared/src/lang/lang.ts";
import { useConfigStore } from "../store/configStore.ts";
import { ref } from "vue";
import { deleteConfig, saveConfig } from "../requests/config.ts";
import { stringToDate, dateToString } from "../lib/convert.ts";
import { ExistingConfig } from "../../../shared/src/types.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
import NewSeasonDialog from "../components/NewSeasonDialog.vue";
const t = language.pages.config;

const loading = ref(false);
const configStore = useConfigStore();

const seasonName = ref<string>("");
const startOrder = ref<Date>(new Date());
const endBiddingRound = ref<Date>(new Date());
const startBiddingRound = ref<Date>(new Date());
const validFrom = ref<Date>(new Date());
const validTo = ref<Date>(new Date());
const budget = ref<number>(0);
const { setError, setSuccess } = useUiFeedback();
const configId = ref<number>(0);
const openCreateDialog = ref<boolean>(false);
const isPublic = ref<boolean>(false);
const isInputValid = ref<boolean>(false);
const form = ref<HTMLFormElement | null>(null);

onMounted(async () => {
  await configStore.update();
});

const onConfigUpdated = () => {
  const orderConfig = configStore.config;
  seasonName.value = orderConfig?.name || "Saison-Bezeichnung";
  startOrder.value = orderConfig?.startOrder || new Date();
  endBiddingRound.value = orderConfig?.endBiddingRound || new Date();
  startBiddingRound.value = orderConfig?.startBiddingRound || new Date();
  budget.value = orderConfig?.budget || 0;
  validFrom.value = orderConfig?.validFrom || new Date();
  validTo.value = orderConfig?.validTo || new Date();
  configId.value = orderConfig?.id || 0;
  isPublic.value = orderConfig?.public || false;
  validateForm();
};

const validateForm = () => {
  form.value?.validate();
};

watch(configStore, () => {
  onConfigUpdated();
});

const onSave = () => {
  loading.value = true;
  const updatedConfig: ExistingConfig = {
    id: configId.value,
    startOrder: startOrder.value,
    endBiddingRound: endBiddingRound.value,
    startBiddingRound: startBiddingRound.value,
    budget: budget.value,
    validFrom: validFrom.value,
    validTo: validTo.value,
    name: seasonName.value,
    public: isPublic.value,
  };
  saveConfig(updatedConfig)
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

const onCreate = () => {
  openCreateDialog.value = true;
};

const onDelete = () => {
  loading.value = true;
  const deletedName = seasonName.value;
  deleteConfig(configId.value)
    .then(async () => {
      await configStore.update();
      setSuccess(language.app.uiFeedback.deleting.success + ": " + deletedName);
      loading.value = false;
    })
    .catch((e: Error) => {
      setError(language.app.uiFeedback.deleting.failed + ": " + e.message);
      loading.value = false;
    });
};

const startOrderRules = [
  (value: string) => {
    if (stringToDate(value) >= startBiddingRound.value)
      return "Bedarsanmeldung muss vor Bietrunde beginnen";
    return true;
  },
];
const updateStartOrder = (val: string) => {
  startOrder.value = stringToDate(val) || startOrder.value;
  validateForm();
};

const startBiddingRules = [
  (value: string) => {
    if (stringToDate(value) <= startOrder.value)
      return "Bietrunde muss nach der Bedarsanmeldung beginnen";
    return true;
  },
  (value: string) => {
    if (stringToDate(value) >= endBiddingRound.value)
      return "Start der Bieterunde muss vor Ende der Bieterunde sein";
    return true;
  },
];
const updateStartBiddingRound = (val: string) => {
  startBiddingRound.value = stringToDate(val) || startBiddingRound.value;
  validateForm();
};

const endBiddingRules = [
  (value: string) => {
    if (stringToDate(value) <= startBiddingRound.value)
      return "Ende der Bietrunde muss nach Beginn der Bietrunde sein";
    return true;
  },
];
const updateEndBiddingRound = (val: string) => {
  endBiddingRound.value = stringToDate(val) || endBiddingRound.value;
  validateForm();
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> {{ t.title }} </v-card-title>
    <v-card-subtitle>{{ t.subtitle }}</v-card-subtitle>
    <v-card-text>
      <v-form v-model="isInputValid" validate-on="input" ref="form">
        <v-container fluid class="pa-0">
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                :label="t.name"
                type="text"
                v-model="seasonName"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                :label="t.budget"
                type="number"
                v-model="budget"
                hint="Wert wird aktuell nur für die Statistik-Anzeige verwendet"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
        <v-switch
          v-model="isPublic"
          :label="isPublic ? t.public.yes : t.public.no"
          color="primary"
          hide-details
        ></v-switch>
        <v-card variant="tonal" class="mb-3">
          <v-card-title>{{ t.validity.title }}</v-card-title>
          <v-card-text>
            <p class="pb-2">{{ t.validity.description }}</p>
            <v-container fluid class="pa-0">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    :label="t.validFrom"
                    type="datetime-local"
                    :model-value="dateToString(validFrom)"
                    @update:model-value="
                      (val: string) =>
                        (validFrom = stringToDate(val) || validFrom)
                    "
                    :onchange="validateForm"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    :label="t.validTo"
                    type="datetime-local"
                    :model-value="dateToString(validTo)"
                    @update:model-value="
                      (val: string) => (validTo = stringToDate(val) || validTo)
                    "
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
        </v-card>

        <v-card variant="tonal" class="mb-3">
          <v-card-title>{{ t.bidding.title }}</v-card-title>
          <v-card-text>
            <p class="pb-2">{{ t.bidding.description }}</p>
            <v-container fluid class="pa-0">
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    :label="t.startOrder"
                    type="datetime-local"
                    :model-value="dateToString(startOrder)"
                    @update:model-value="updateStartOrder"
                    :rules="startOrderRules"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :label="t.startBiddingRound"
                    type="datetime-local"
                    :model-value="dateToString(startBiddingRound)"
                    @update:model-value="updateStartBiddingRound"
                    :rules="startBiddingRules"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :label="t.endBiddingRound"
                    type="datetime-local"
                    :model-value="dateToString(endBiddingRound)"
                    @update:model-value="updateEndBiddingRound"
                    :rules="endBiddingRules"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
        </v-card>
        <v-container fluid class="pa-0">
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                label="ID"
                type="number"
                v-model="configId"
                disabled
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-btn @click="onSave" :loading="loading" :disabled="!isInputValid">{{
        language.app.actions.save
      }}</v-btn>
      <v-btn color="secondary" :loading="loading">
        {{ language.app.actions.more }}
        <v-menu activator="parent">
          <v-list>
            <v-list-item>
              <v-list-item-title>
                <v-btn @click="onCreate" :loading="loading">
                  {{ language.app.actions.createNew }}
                </v-btn>
              </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>
                <v-btn
                  color="error"
                  @click="() => onDelete()"
                  :loading="loading"
                >
                  {{ language.app.actions.delete }}
                </v-btn>
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-btn>
    </v-card-actions>
  </v-card>

  <NewSeasonDialog :open="openCreateDialog" @close="openCreateDialog = false" />
</template>
