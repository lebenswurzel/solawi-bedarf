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
import { onMounted, provide, ref } from "vue";
import UserDialog from "../components/UserDialog.vue";
import { language } from "../lang/lang.ts";
import { useUserStore } from "../store/userStore.ts";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../store/configStore";
import { NewUser, User } from "../../../shared/src/types";
import { UserRole } from "../../../shared/src/enum";

const t = language.pages.user;

const configStore = useConfigStore();
const { externalAuthProvider } = storeToRefs(configStore);

const defaultUser: NewUser = {
  role: UserRole.USER,
  active: false,
};

const userStore = useUserStore();
const { users } = storeToRefs(userStore);
const open = ref(false);
const dialogUser = ref<NewUser | User>({ ...defaultUser });
const search = ref<string>("");
const selectedUsers = ref<User[]>([]);

provide("dialogUser", dialogUser);

const headers = [
  { title: "Name", key: "name" },
  { title: "Rolle", key: "role" },
  { title: "Aktiv", key: "active" },
  { title: "ID", key: "id" },
  { title: "Bearbeiten", key: "edit" },
];

onMounted(async () => {
  await userStore.update();
});

const onCreateUser = () => {
  dialogUser.value = { ...defaultUser };
  open.value = true;
};

const onEditUser = (user: User) => {
  dialogUser.value = user;
  open.value = true;
};

const onClose = async () => {
  open.value = false;
  await userStore.update();
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title class="d-flex">
      {{ t.title }}
      <v-spacer></v-spacer>
      <v-text-field
        prepend-inner-icon="mdi-magnify"
        v-model="search"
        variant="outlined"
        label="Suche nach Benutzername"
        hide-details
        single-line
      />
    </v-card-title>
    <v-card-text>
      <v-data-table
        :headers="headers"
        :items="users"
        density="compact"
        :item-value="(item: User) => item"
        show-select
        v-model="selectedUsers"
        :search="search"
      >
        <template v-slot:item.active="{ item }">
          <v-checkbox-btn v-model="item.active" readonly></v-checkbox-btn>
        </template>
        <template v-slot:item.edit="{ item }">
          <v-btn
            icon="mdi-pencil"
            variant="plain"
            @click="() => onEditUser(item)"
          ></v-btn>
        </template>
      </v-data-table>
      <div v-if="selectedUsers.length">
        <p>Auswahl: {{ selectedUsers.map((v) => v.name).join(", ") }}</p>
        <p>Hier könnte bei Bedarf eine Aktion ausgelöst werden, z.B.:</p>
        <v-btn @click="() => console.log(selectedUsers)" variant="outlined"
          >aktivieren</v-btn
        >
        <v-btn @click="() => console.log(selectedUsers)" variant="outlined"
          >deaktivieren</v-btn
        >
      </div>
    </v-card-text>
    <v-card-actions v-if="!externalAuthProvider">
      <v-btn @click="onCreateUser" prepend-icon="mdi-account-plus-outline">{{
        t.action.createUser
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <UserDialog :open="open" @close="onClose" />
</template>
../../../shared/src/types.ts
