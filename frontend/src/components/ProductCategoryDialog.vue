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
import { saveProductCategory } from "../requests/productCategory";
import {
  NewProductCategory,
  OptionalId,
  ProductCategory,
} from "../../../shared/src/types.ts";
import { language } from "../../../shared/src/lang/lang.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
import { ref, watch } from "vue";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import { ProductCategoryType } from "../../../shared/src/enum.ts";
const t = language.pages.product.dialog;

const uiFeedback = useUiFeedback();
const configStore = useConfigStore();
const productStore = useProductStore();

const props = defineProps<{
  open: boolean;
  productCategory: NewProductCategory | ProductCategory;
}>();

const editedProductCategory = ref<NewProductCategory | ProductCategory>({
  ...props.productCategory,
});

const productCategoryTypOptions = [
  {
    title: language.app.options.productCategoryTyps.SELFGROWN.title,
    value: ProductCategoryType.SELFGROWN,
  },
  {
    title: language.app.options.productCategoryTyps.COOPERATION.title,
    value: ProductCategoryType.COOPERATION,
  },
];

watch(
  () => props.open,
  () => {
    if (props.open) {
      // update the edited value when opening the dialog
      editedProductCategory.value = {
        ...props.productCategory,
      };
    }
  },
);

const emit = defineEmits(["close"]);

const loading = ref(false);

const onClose = () => {
  emit("close");
};

const onSave = async () => {
  loading.value = true;
  saveProductCategory(
    editedProductCategory.value as Required<NewProductCategory> & OptionalId,
  )
    .then(() => {
      uiFeedback.setSuccess(language.app.uiFeedback.saving.success);
      productStore.update(configStore.activeConfigId);
      loading.value = false;
      emit("close");
    })
    .catch((e: Error) => {
      uiFeedback.setError(language.app.uiFeedback.saving.failed, e);
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
          v-model="editedProductCategory.name"
          :label="t.name"
        ></v-text-field>
        <v-switch
          v-model="editedProductCategory.active"
          :label="`${
            editedProductCategory.active
              ? language.app.options.active.true
              : language.app.options.active.false
          }`"
          color="primary"
        ></v-switch>
        <v-select
          v-model="editedProductCategory.typ"
          :label="t.productCategoryType"
          :items="productCategoryTypOptions"
        ></v-select>
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
</template>
../../../shared/src/types.ts
