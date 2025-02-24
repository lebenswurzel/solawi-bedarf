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
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { Address, Applicant } from "../../../../shared/src/types";
import { activateApplicant, getApplicants } from "../../requests/applicant";
import { ApplicantState } from "../../../../shared/src/enum";
import BusyIndicator from "../BusyIndicator.vue";
import { useUiFeedback } from "../../store/uiFeedbackStore";
import Papa from "papaparse";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import { pick } from "../../../../shared/src/util/utils";

const props = defineProps<{
  state: ApplicantState;
  exportColumns: (keyof Address)[];
}>();
const busy = ref(true);

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
  await refresh();
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
  refresh();
});

const getAddress = ({ address: { street, postalcode, city } }: Applicant) =>
  `${street}, ${postalcode} ${city}`;
const getContact = ({ address: { email, phone } }: Applicant) =>
  `${email} / ${phone}`;
const getName = ({ address: { firstname, lastname }, name }: Applicant) =>
  `${firstname} ${lastname} [${name}]`;

const onExportData = () => {
  const csv = Papa.unparse(
    applicants.value.map((v) => ({
      name: v.name,
      ...pick(v.address, props.exportColumns),
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
</script>

<template>
  <BusyIndicator :busy="busy" class="mt-2" />
  <v-menu v-if="props.state === ApplicantState.CONFIRMED">
    <template v-slot:activator="{ props }">
      <v-btn variant="plain" icon="mdi-dots-vertical" v-bind="props"> </v-btn>
    </template>
    <v-list>
      <v-list-item>
        <v-btn @click="onExportData" variant="text"
          >Nutzerdaten exportieren</v-btn
        >
      </v-list-item>
    </v-list>
  </v-menu>
  <div v-if="applicants.length == 0" class="my-5">
    <div class="ma-2" v-if="busy">Daten werden geladen ...</div>
    <div class="ma-2" v-else>Keine Einträge</div>
  </div>
  <v-list v-else>
    <template v-for="applicant in applicants">
      <v-list-item>
        <v-list-item-title>
          {{ getName(applicant) }}
        </v-list-item-title>
        <v-list-item-subtitle style="max-width: fit-content">
          {{
            applicant.createdAt &&
            format(parseISO(applicant.createdAt), "dd.MM.yyyy HH:mm")
          }}
        </v-list-item-subtitle>
        <v-list-item-subtitle style="max-width: fit-content">
          {{ getContact(applicant) }}
        </v-list-item-subtitle>
        <v-list-item-subtitle style="max-width: fit-content">
          {{ getAddress(applicant) }}
        </v-list-item-subtitle>
        {{ applicant.comment }}
        <template v-slot:append v-if="props.state != ApplicantState.CONFIRMED">
          <v-btn
            icon
            class="mr-2"
            @click="() => activate(applicant.id!, undefined)"
          >
            <v-icon> mdi-close-thick</v-icon>
          </v-btn>
          <v-btn icon @click="() => activate(applicant.id!, applicant.name!)">
            <v-icon> mdi-check-bold</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </template>
  </v-list>
</template>
