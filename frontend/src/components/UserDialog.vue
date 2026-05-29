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
import { saveUser, getCommercialProfile } from "../requests/user.ts";
import { inject, Ref, ref, watch, watchEffect, computed } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import {
  CommercialProfile,
  isIdType,
  NewUser,
  User,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../store/configStore";
import { getOrder } from "../requests/shop";
import { stringToDate, dateToString } from "../lib/convert.ts";
const t = language.pages.user.dialog;

const configStore = useConfigStore();
const { externalAuthProvider, activeConfigId } = storeToRefs(configStore);

defineProps(["open"]);
const emit = defineEmits(["close"]);

const orderValidFrom = ref<Date | null>(null);
const loading = ref(false);
const error = ref<string>();
const password = ref<string>();
const enableValidFrom = ref(false);
const commercialProfile = ref<CommercialProfile>({
  companyName: "",
  street: "",
  postalcode: "",
  city: "",
});

const dialogUser = inject<Ref<{ user: NewUser | User }>>("dialogUser") as Ref<{
  user: NewUser | User;
}>;
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
  {
    title: language.app.options.userRoles[UserRole.COMMERCIAL],
    value: UserRole.COMMERCIAL,
  },
];

const isCommercial = computed(
  () => dialogUser.value.user.role === UserRole.COMMERCIAL,
);

const onClose = () => {
  password.value = undefined;
  emit("close");
};

const onSave = () => {
  loading.value = true;
  const includeValidFrom = enableValidFrom.value;
  saveUser({
    id: isIdType(dialogUser.value.user) ? dialogUser.value.user.id : undefined,
    name: dialogUser.value.user.name!,
    role: dialogUser.value.user.role,
    active: dialogUser.value.user.active,
    password: password.value || undefined,
    orderValidFrom: includeValidFrom ? orderValidFrom.value : null,
    requisitionConfigId: activeConfigId.value,
    commercialProfile: isCommercial.value ? commercialProfile.value : null,
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
  if (isIdType(dialogUser.value.user)) {
    if (dialogUser.value.user.role === UserRole.COMMERCIAL) {
      const profile = await getCommercialProfile(dialogUser.value.user.id);
      commercialProfile.value = profile.commercialProfile || {
        companyName: "",
        street: "",
        postalcode: "",
        city: "",
      };
      orderValidFrom.value = null;
      enableValidFrom.value = false;
    } else {
      const order = await getOrder(
        dialogUser.value.user.id,
        activeConfigId.value,
      );
      orderValidFrom.value = order?.validFrom || null;
      enableValidFrom.value = !!orderValidFrom.value;
    }
  } else {
    orderValidFrom.value = null;
    enableValidFrom.value = false;
    commercialProfile.value = {
      companyName: "",
      street: "",
      postalcode: "",
      city: "",
    };
  }
});

watch(
  () => dialogUser.value.user.role,
  (role) => {
    if (role !== UserRole.COMMERCIAL) {
      enableValidFrom.value = !!orderValidFrom.value;
    } else {
      enableValidFrom.value = false;
    }
  },
);
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        {{ t.title }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          :disabled="externalAuthProvider"
          v-model="dialogUser.user.name"
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
          v-model="dialogUser.user.role"
          :items="roleOptions"
          :label="t.role"
        ></v-select>
        <v-switch
          v-model="dialogUser.user.active"
          :label="`${
            dialogUser.user.active
              ? language.app.options.active.true
              : language.app.options.active.false
          }`"
          color="primary"
        ></v-switch>
        <template v-if="isCommercial">
          <v-text-field
            v-model="commercialProfile.companyName"
            :label="t.companyName"
          ></v-text-field>
          <v-text-field
            v-model="commercialProfile.street"
            :label="t.street"
          ></v-text-field>
          <v-text-field
            v-model="commercialProfile.postalcode"
            :label="t.postalcode"
          ></v-text-field>
          <v-text-field
            v-model="commercialProfile.city"
            :label="t.city"
          ></v-text-field>
        </template>
        <v-text-field
          v-if="enableValidFrom && !isCommercial"
          :label="t.orderValidFrom"
          type="datetime-local"
          :model-value="
            orderValidFrom ? dateToString(orderValidFrom || null) : null
          "
          @update:model-value="
            (val: string) =>
              (orderValidFrom = stringToDate(val) || orderValidFrom)
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
