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
import { inject, Ref, ref } from "vue";
import { saveProductCategory } from "../requests/productCategory";
import {
  NewProductCategory,
  OptionalId,
  ProductCategory,
} from "../../../shared/src/types.ts";
import { language } from "../lang/lang.ts";
const t = language.pages.product.dialog;

defineProps(["open"]);
const emit = defineEmits(["close"]);

const loading = ref(false);
const error = ref<string>();

const dialogProductCategory = inject<Ref<NewProductCategory | ProductCategory>>(
  "dialogProductCategory",
) as Ref<NewProductCategory | ProductCategory>;

const onClose = () => {
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveProductCategory(
    dialogProductCategory.value as Required<NewProductCategory> & OptionalId,
  )
    .then(() => {
      loading.value = false;
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
        <span class="text-h5">{{ t.productCategory }}</span>
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="dialogProductCategory.name"
          :label="t.name"
        ></v-text-field>
        <v-switch
          v-model="dialogProductCategory.active"
          :label="`${
            dialogProductCategory.active
              ? language.app.options.active.true
              : language.app.options.active.false
          }`"
          color="primary"
        ></v-switch>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onClose">
          {{ language.app.actions.close }}
        </v-btn>
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
../../../shared/src/types.ts
