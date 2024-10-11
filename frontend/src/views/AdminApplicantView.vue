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
import { applicantCreatedAtDown, applicantCreatedAtUp } from "../lib/compare";
import { Applicant } from "../../../shared/src/types";
import { activateApplicant, getApplicants } from "../requests/applicant";
import { ApplicantState } from "../../../shared/src/enum";

const applicants = ref<Applicant[]>([]);
const select = ref<ApplicantState>(ApplicantState.NEW);

const applicantOptions = [
  {
    title: "Neu",
    value: ApplicantState.NEW,
  },
  {
    title: "Gelöscht",
    value: ApplicantState.DELETED,
  },
  {
    title: "Bestätigt",
    value: ApplicantState.CONFIRMED,
  },
];

const activate = async (id: number, name?: string) => {
  await activateApplicant(id, name);
  applicants.value = await getApplicants(select.value);
};

const onStateChange = async (state: ApplicantState) => {
  select.value = state;
  if (state == ApplicantState.CONFIRMED) {
    applicants.value = (await getApplicants(select.value)).sort(
      applicantCreatedAtDown,
    );
  } else {
    applicants.value = (await getApplicants(select.value)).sort(
      applicantCreatedAtUp,
    );
  }
};

onMounted(async () => {
  applicants.value = await getApplicants(select.value);
});

const getAddress = ({ address: { street, postalcode, city } }: Applicant) =>
  `${street}, ${postalcode} ${city}`;
const getContact = ({ address: { email, phone } }: Applicant) =>
  `${email} / ${phone}`;
const getName = ({ address: { firstname, lastname }, name }: Applicant) =>
  `${firstname} ${lastname} [${name}]`;
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> Registierte User </v-card-title>
    <v-card-item>
      <v-select
        :model-value="select"
        @update:model-value="onStateChange"
        :items="applicantOptions"
        item-props
        persistent-hint
        label="Status"
      />
    </v-card-item>
    <v-card-text>
      <v-list>
        <template v-for="applicant in applicants">
          <v-hover v-slot="{ props }">
            <v-list-item v-bind="props">
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
              <template v-slot:append v-if="select != ApplicantState.CONFIRMED">
                <v-btn
                  icon
                  class="mr-2"
                  @click="() => activate(applicant.id!, undefined)"
                >
                  <v-icon> mdi-close-thick</v-icon>
                </v-btn>
                <v-btn
                  icon
                  @click="() => activate(applicant.id!, applicant.name!)"
                >
                  <v-icon> mdi-check-bold</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-hover>
        </template>
      </v-list>
    </v-card-text>
  </v-card>
</template>
../../../shared/src/types.jsimport { ApplicantState } from
"../../../shared/src/enum";
