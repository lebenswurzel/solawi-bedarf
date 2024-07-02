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
import { saveUser } from "../requests/user.ts";
import { inject, Ref, ref, watchEffect } from "vue";
import { language } from "../lang/lang.ts";
import { isIdType, NewUser, User } from "../../../shared/src/types.ts";
import { UserRole } from "../../../shared/src/enum.ts";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../store/configStore";
import { getOrder } from "../requests/shop";
import { stringToDate, dateToString } from "../lib/convert.ts";
const t = language.pages.user.dialog;

const configStore = useConfigStore();
const { externalAuthProvider } = storeToRefs(configStore);

defineProps(["open"]);
const emit = defineEmits(["close"]);

const orderValidFrom = ref<Date | null>(null);
const loading = ref(false);
const error = ref<string>();
const password = ref<string>();

const dialogUser = inject<Ref<NewUser | User>>("dialogUser") as Ref<
  NewUser | User
>;
const roleOptions = [
  {
    title: language.app.options.userRoles[UserRole.USER],
    value: UserRole.USER,
  },
  {
    title: language.app.options.userRoles[UserRole.EMPLOYEE],
    value: UserRole.EMPLOYEE,
  },
  {
    title: language.app.options.userRoles[UserRole.ADMIN],
    value: UserRole.ADMIN,
  },
];

const onClose = () => {
  password.value = undefined;
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveUser({
    id: isIdType(dialogUser.value) ? dialogUser.value.id : undefined,
    name: dialogUser.value.name!,
    role: dialogUser.value.role,
    active: dialogUser.value.active,
    password: password.value || undefined,
    orderValidFrom: orderValidFrom.value,
  })
    .then(() => {
      loading.value = false;
      password.value = undefined;
      emit("close");
    })
    .catch((e: Error) => {
      error.value = e.message;
      loading.value = false;
    });
};

watchEffect(async () => {
  if (isIdType(dialogUser.value)) {
    const order = await getOrder(dialogUser.value.id);
    orderValidFrom.value = order.validFrom || null;
  } else {
    orderValidFrom.value = null;
  }
});
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        <span class="text-h5">{{ t.title }}</span>
      </v-card-title>
      <v-card-text>
        <v-text-field
          :disabled="externalAuthProvider"
          v-model="dialogUser.name"
          :label="t.name"
        ></v-text-field>
        <v-text-field
          v-if="!externalAuthProvider"
          v-model="password"
          :label="t.password"
          type="password"
        ></v-text-field>
        <v-select
          :disabled="externalAuthProvider"
          v-model="dialogUser.role"
          :items="roleOptions"
          :label="t.role"
        ></v-select>
        <v-switch
          v-model="dialogUser.active"
          :label="`${
            dialogUser.active
              ? language.app.options.active.true
              : language.app.options.active.false
          }`"
          color="primary"
        ></v-switch>
        <v-text-field
          :label="t.orderValidFrom"
          type="datetime-local"
          :model-value="orderValidFrom ? dateToString(orderValidFrom) : null"
          @update:model-value="
            (val) => (orderValidFrom = stringToDate(val) || orderValidFrom)
          "
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onClose"> {{ language.app.actions.close }} </v-btn>
        <v-btn :loading="loading" @click="onSave">
          {{ language.app.actions.save }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar
    :model-value="!!error"
    color="red"
    @update:model-value="() => (error = undefined)"
  >
    {{ error }}
  </v-snackbar>
</template>
