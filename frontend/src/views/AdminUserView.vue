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
import { computed } from "vue";
import { userAlphabeticalDown, userAlphabeticalUp } from "../lib/compare";
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

const sortOrderOptions = {
  alphabetical_up: t.sort.alpha_up,
  alphabetical_down: t.sort.alpha_down,
};

const filterOptions = {
  active: language.app.options.active.true,
  inactive: language.app.options.active.false,
};

const userStore = useUserStore();
const open = ref(false);
const filter = ref<string[]>([filterOptions.active, filterOptions.inactive]);
const sortOrder = ref<string>(sortOrderOptions.alphabetical_down);
const dialogUser = ref<NewUser | User>({ ...defaultUser });

provide("dialogUser", dialogUser);

onMounted(async () => {
  await userStore.update();
});

const userlist = computed(() => {
  const filteredUserlist = userStore.users.filter((u) => {
    if (filter.value.includes(filterOptions.active) && u.active) {
      return true;
    }
    if (filter.value.includes(filterOptions.inactive) && !u.active) {
      return true;
    }
    return false;
  });
  if (sortOrder.value == sortOrderOptions.alphabetical_down) {
    return filteredUserlist.sort(userAlphabeticalDown);
  }
  if (sortOrder.value == sortOrderOptions.alphabetical_up) {
    return filteredUserlist.sort(userAlphabeticalUp);
  }

  return filteredUserlist;
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
    <v-card-title> {{ t.title }} </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-select
            chips
            multiple
            :label="t.filter.label"
            :items="[filterOptions.active, filterOptions.inactive]"
            v-model="filter"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            chips
            :label="t.sort.label"
            :items="[
              sortOrderOptions.alphabetical_up,
              sortOrderOptions.alphabetical_down,
            ]"
            v-model="sortOrder"
          />
        </v-col>
      </v-row>
      <v-list>
        <v-list-item
          v-for="userItem in userlist"
          @click="() => onEditUser(userItem)"
        >
          {{ userItem.name }}
          <v-list-item-subtitle>
            {{ userItem.id }} - {{ userItem.role }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
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
