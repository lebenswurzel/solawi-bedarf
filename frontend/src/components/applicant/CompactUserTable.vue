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
import {
  ApplicantWithOrders,
  UserId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { computed, ref } from "vue";

const model = defineModel<UserId[]>({ required: true });

const props = defineProps<{
  users: ApplicantWithOrders[];
}>();

const emit = defineEmits<{ (e: "update:value", value: UserId[]): void }>();

const search = ref("");

const headers = [
  { title: "ID", key: "id" },
  { title: "Benutzer", key: "name" },
  { title: "Name", key: "realName" },
  { title: "Adresse", key: "address" },
];

const items = computed(() => {
  return props.users.map((user) => {
    return {
      id: user.userId,
      name: user.name,
      realName: `${user.address.firstname} ${user.address.lastname}`,
      address: `${user.address.street}, ${user.address.postalcode} ${user.address.city}`,
    };
  });
});
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="items"
    density="compact"
    show-select
    :search="search"
    v-model="model"
  >
    <template v-slot:top>
      <v-text-field
        prepend-inner-icon="mdi-magnify"
        v-model="search"
        variant="outlined"
        density="compact"
        label="Suche"
        single-line
        clearable
      />
    </template>
    <template v-slot:item.name="{ item }">
      <v-btn
        icon="mdi-account-arrow-right"
        variant="plain"
        :to="{ path: `/adminusers/${item.name}` }"
        density="compact"
      ></v-btn>
      {{ item.name }}
    </template>
  </v-data-table>
</template>
