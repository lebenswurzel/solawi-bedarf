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
import { ref } from "vue";
import { ApplicantState } from "../../../shared/src/enum";
import ApplicantView from "../components/applicant/ApplicantView.vue";

const currentTab = ref(ApplicantState.NEW);

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
</script>

<template>
  <v-card class="ma-2">
    <v-card-title>Registrierte Nutzer</v-card-title>
    <v-tabs v-model="currentTab">
      <v-tab v-for="item in applicantOptions" :value="item.value">{{
        item.title
      }}</v-tab>
    </v-tabs>
    <v-tabs-window v-model="currentTab">
      <template v-for="item in applicantOptions">
        <v-tabs-window-item :value="item.value">
          <ApplicantView :state="item.value" />
        </v-tabs-window-item>
      </template>
    </v-tabs-window>
  </v-card>
</template>
