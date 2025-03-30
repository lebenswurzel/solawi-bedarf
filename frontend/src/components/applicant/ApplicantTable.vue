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
import { computed, onMounted, ref } from "vue";
import { Applicant, ApplicantExport } from "../../../../shared/src/types";
import { activateApplicant, getApplicants } from "../../requests/applicant";
import { ApplicantState } from "../../../../shared/src/enum";
import BusyIndicator from "../BusyIndicator.vue";
import { useUiFeedback } from "../../store/uiFeedbackStore";
import Papa from "papaparse";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import { pick } from "../../../../shared/src/util/utils";
import { prettyDate } from "../../../../shared/src/util/dateHelper";
import { language } from "../../../../shared/src/lang/lang";
import { escapeHtmlEntities } from "../../../../shared/src/util/stringHelper";
import { useRoute } from "vue-router";

const props = defineProps<{
  state: ApplicantState;
  exportColumns: (keyof ApplicantExport)[];
}>();
const emit = defineEmits<{ (e: "refreshAll"): void }>();
const route = useRoute();
const busy = ref(true);
const search = ref<string>("");

const uiFeedbackStore = useUiFeedback();
const applicants = ref<Applicant[]>([]);

const activate = async (id: number, name?: string) => {
  busy.value = true;
  try {
    await activateApplicant(id, name);
  } catch (e) {
    uiFeedbackStore.setError("Fehler bei der Aktualisierung", e as Error);
  } finally {
    busy.value = false;
  }
  emit("refreshAll");
};

const refresh = async () => {
  busy.value = true;
  try {
    applicants.value = await getApplicants(props.state);
  } catch (e) {
    uiFeedbackStore.setError("Fehler bei der Abfrage", e as Error);
  } finally {
    busy.value = false;
  }
};

onMounted(async () => {
  await refresh();
  if (route.params.userName) {
    search.value = route.params.userName as string;
  }
});

const getAddress = ({ address: { street, postalcode, city } }: Applicant) =>
  `${escapeHtmlEntities(street)}<br>${escapeHtmlEntities(postalcode)} ${escapeHtmlEntities(city)}`;
const getContact = ({ address: { email, phone } }: Applicant) =>
  `${escapeHtmlEntities(email)}<br>${escapeHtmlEntities(phone)}`;
const getName = ({ address: { firstname, lastname } }: Applicant) =>
  `${firstname} ${lastname}`;

const onExportData = () => {
  const csv = Papa.unparse(
    applicants.value.map((v) => ({
      name: v.name,
      ...pick({ ...v, ...v.address }, props.exportColumns),
    })),
    {
      delimiter: ";",
      quotes: true,
    },
  );

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = `userdata.csv`;
  a.href = url;
  a.download = sanitizeFileName(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const tableColumns = computed(() =>
  [
    { title: "Benutzer", key: "name" },
    {
      title: "Name",
      key: "realName",
    },
    {
      title: "Kontakt",
      key: "contact",
    },
    {
      title: "Adresse",
      key: "address",
    },
    {
      title: "Kommentar",
      key: "comment",
    },
    { title: "Angelegt", key: "createdAt" },
    { title: "ID", key: "id" },
    { title: "Aktion", key: "action" },
  ].filter(
    (col) =>
      !(props.state === ApplicantState.CONFIRMED && col.key === "action"),
  ),
);

const tableItems = computed(() =>
  applicants.value.map((a) => ({
    ...a,
    realName: getName(a),
    contact: getContact(a),
    address: getAddress(a),
  })),
);
</script>

<template>
  <BusyIndicator :busy="busy" class="mt-2" />
  <v-card-text>
    <div v-if="applicants.length == 0" class="my-5">
      <div class="ma-2" v-if="busy">Daten werden geladen ...</div>
      <div class="ma-2" v-else>Keine Einträge</div>
    </div>
    <template v-else>
      <v-container fluid>
        <v-row no-gutters>
          <v-col cols="11">
            <v-text-field
              prepend-inner-icon="mdi-magnify"
              v-model="search"
              variant="outlined"
              density="compact"
              label="Volltextsuche in allen Spalten"
              single-line
              clearable
              hint="Volltextsuche in allen Spalten"
            />
          </v-col>
          <v-spacer></v-spacer>
          <v-col cols="auto">
            <v-menu v-if="props.state === ApplicantState.CONFIRMED">
              <template v-slot:activator="{ props }">
                <v-btn variant="plain" icon="mdi-dots-vertical" v-bind="props">
                </v-btn>
              </template>
              <v-list>
                <v-list-item>
                  <v-btn @click="onExportData" variant="text"
                    >Nutzerdaten exportieren</v-btn
                  >
                </v-list-item>
              </v-list>
            </v-menu>
          </v-col>
        </v-row>
      </v-container>
      <v-data-table
        :headers="tableColumns"
        :items="tableItems"
        :search="search"
      >
        <template v-slot:item.name="{ item }">
          <v-btn
            v-if="props.state == ApplicantState.CONFIRMED"
            icon="mdi-account-arrow-right"
            variant="plain"
            :to="{ path: `/adminusers/${item.name}` }"
            density="compact"
          ></v-btn
          >{{ item.name }}
        </template>
        <template v-slot:item.contact="{ item }">
          <div v-html="item.contact"></div>
        </template>
        <template v-slot:item.address="{ item }">
          <div v-html="item.address"></div>
        </template>
        <template v-slot:item.createdAt="{ item }">
          {{ item.createdAt && prettyDate(item.createdAt) }}
        </template>
        <template v-slot:item.action="{ item }">
          <template v-if="props.state != ApplicantState.CONFIRMED">
            <v-btn-group dense>
              <v-tooltip :text="language.app.actions.delete" open-on-click>
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    @click="() => activate(item.id!, undefined)"
                    icon="mdi-close-thick"
                    size="small"
                    color="warning"
                  >
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip :text="language.app.actions.activate" open-on-click>
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    @click="() => activate(item.id!, item.name!)"
                    icon="mdi-check-bold"
                    size="small"
                    color="primary"
                  >
                  </v-btn>
                </template>
              </v-tooltip>
            </v-btn-group>
          </template>
        </template>
      </v-data-table>
    </template>
  </v-card-text>
</template>
