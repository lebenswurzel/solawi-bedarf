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
import { computed, inject, Ref, ref } from "vue";
import { language } from "../lang/lang.ts";
import { saveDepot } from "../requests/depot";
import { Depot, NewDepot, OptionalId } from "../../../shared/src/types.ts";
const t = language.pages.depots;

defineProps(["open"]);
const emit = defineEmits(["close"]);

const loading = ref(false);
const error = ref<string>();
const password = ref<string>();

const dialogDepot = inject<Ref<NewDepot | Depot>>("dialogDepot") as Ref<
  NewDepot | Depot
>;

const disabled = computed(() => {
  return (
    dialogDepot.value.name === undefined ||
    dialogDepot.value.address === undefined ||
    dialogDepot.value.openingHours === undefined
  );
});

const onClose = () => {
  password.value = undefined;
  emit("close");
};

const onSave = () => {
  loading.value = true;
  let capacity = dialogDepot.value.capacity as string | null | number;
  if (typeof capacity == "string") {
    capacity = parseInt(capacity);
  }
  if (Number.isNaN(capacity) || capacity === undefined) {
    capacity = null;
  }
  saveDepot(dialogDepot.value as Required<NewDepot> & OptionalId)
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
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        <span class="text-h5">{{ t.dialog.title }}</span>
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="dialogDepot.name"
          :label="t.dialog.name"
        ></v-text-field>
        <v-switch
          v-model="dialogDepot!.active"
          :label="`${
            dialogDepot.active
              ? language.app.options.active.true
              : language.app.options.active.false
          }`"
          color="primary"
        ></v-switch>
        <v-text-field
          type="number"
          v-model="dialogDepot!.capacity"
          label="Kapazität"
          clearable
          @click:clear="() => (dialogDepot.capacity = null)"
        ></v-text-field>
        <v-text-field
          v-model="dialogDepot.address"
          :label="t.dialog.adress"
        ></v-text-field>
        <v-text-field
          v-model="dialogDepot.openingHours"
          :label="t.dialog.openingHours"
        ></v-text-field>
        <v-text-field
          v-model="dialogDepot.comment"
          :label="t.dialog.comment"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onClose">
          {{ language.app.actions.close }}
        </v-btn>
        <v-btn :loading="loading" @click="onSave" :disabled="disabled">
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
../../../shared/src/types.tsimport { NewDepot, Depot, OptionalId } from
"../../../shared/src/types.ts";
