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
import { onMounted, ref } from "vue";
import { ApplicantState } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import ApplicantTable from "../components/applicant/ApplicantTable.vue";
import {
  Address,
  ApplicantExport,
  ImportApplicantRequest,
  ImportApplicantsResponse,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import CsvImportPanel from "../components/import/CsvImportPanel.vue";
import { importApplicantsData } from "../requests/applicant";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import BusyIndicator from "../components/BusyIndicator.vue";
import { useUiFeedback } from "../store/uiFeedbackStore";
import { useRoute } from "vue-router";

const currentTab = ref(ApplicantState.NEW);
const openImportdialog = ref(false);
const importResponse = ref<ImportApplicantsResponse | null>(null);
const importBusy = ref(false);
const refreshKey = ref(0);
const uiFeedbackStore = useUiFeedback();
const route = useRoute();

const applicantOptions = [
  {
    title: "Neu",
    value: ApplicantState.NEW,
  },
  {
    title: "Bestätigt",
    value: ApplicantState.CONFIRMED,
  },
  {
    title: "Gelöscht",
    value: ApplicantState.DELETED,
  },
];

const dummyImport: Address = {
  firstname: "",
  lastname: "",
  street: "",
  postalcode: "",
  city: "",
  email: "",
  phone: "",
};

const dummyExport: ApplicantExport = {
  ...dummyImport,
  comment: "",
};

const importColumns = Object.keys(dummyImport) as (keyof Address)[];
const exportColumns = Object.keys(dummyExport) as (keyof ApplicantExport)[];

const onImportData = () => {
  importResponse.value = null;
  openImportdialog.value = true;
};

const importUserData = async (data: ImportApplicantRequest[]) => {
  importResponse.value = null;
  importBusy.value = true;
  try {
    const result = await importApplicantsData(data);
    importResponse.value = result;
    uiFeedbackStore.setSuccess("Importvorgang abgeschlossen");
  } catch (e) {
    uiFeedbackStore.setError("Error importing user data", e as Error);
  } finally {
    refreshViews();
    importBusy.value = false;
  }
};

const refreshViews = () => {
  refreshKey.value++;
};

onMounted(() => {
  if (route.params.tab) {
    const tab = route.params.tab as string;
    currentTab.value = tab.toUpperCase() as ApplicantState;
  }
});
</script>

<template>
  <v-card class="ma-2">
    <v-row>
      <v-col>
        <v-card-title> Registrierte Nutzer </v-card-title>
      </v-col>
      <v-spacer></v-spacer>
      <v-col cols="1">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn variant="plain" icon="mdi-dots-vertical" v-bind="props">
            </v-btn>
          </template>
          <v-list>
            <v-list-item>
              <v-list-item-title>
                <v-btn @click="onImportData" variant="text">
                  Nutzerdaten importieren
                </v-btn>
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col></v-row
    >
    <v-tabs v-model="currentTab">
      <v-tab v-for="item in applicantOptions" :value="item.value">{{
        item.title
      }}</v-tab>
    </v-tabs>
    <v-tabs-window v-model="currentTab">
      <template v-for="item in applicantOptions">
        <v-tabs-window-item :value="item.value">
          <ApplicantTable
            :state="item.value"
            :key="`${item.value}-${refreshKey}`"
            :export-columns="exportColumns"
            @refresh-all="refreshViews"
          />
        </v-tabs-window-item>
      </template>
    </v-tabs-window>
  </v-card>

  <v-dialog :model-value="openImportdialog">
    <v-card title="Nutzerdaten aus CSV importieren">
      <BusyIndicator :busy="importBusy" />
      <template v-slot:append>
        <v-btn variant="text" @click="openImportdialog = false">{{
          language.app.actions.close
        }}</v-btn>
      </template>
      <v-card-text v-if="importResponse">
        Importiervorgang abgeschlossen:
        <v-alert
          variant="outlined"
          color="error"
          class="mt-2"
          density="compact"
          v-if="importResponse.error.length"
        >
          <p v-for="message in importResponse.error">
            {{ message }}
          </p>
        </v-alert>
        <v-alert
          variant="outlined"
          color="success"
          class="mt-2"
          density="compact"
          v-if="importResponse.success.length"
        >
          <p v-for="message in importResponse.success">
            {{ message }}
          </p>
        </v-alert>
      </v-card-text>
      <CsvImportPanel
        @confirm="importUserData"
        identifier="name"
        :columns="importColumns"
      />
    </v-card>
  </v-dialog>
</template>
