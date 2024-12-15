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
import { saveProduct } from "../requests/product.ts";
import { language } from "../../../shared/src/lang/lang.ts";
import { interpolate } from "../lang/template.ts";
import { useProductStore } from "../store/productStore.ts";
import { computed } from "@vue/reactivity";
import { NewProduct, OptionalId, Product } from "../../../shared/src/types.ts";
import { Unit } from "../../../shared/src/enum.ts";
import { getLangUnit } from "../../../shared/src/util/unitHelper.ts";
const t = language.pages.product.dialog;

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const loading = ref(false);
const error = ref<string>();
const productStore = useProductStore();

const dialogProduct = inject<Ref<NewProduct | Product>>("dialogProduct") as Ref<
  NewProduct | Product
>;

const unitOptions = [
  { title: language.app.units.weight, value: Unit.WEIGHT },
  { title: language.app.units.piece, value: Unit.PIECE },
  { title: language.app.units.volume, value: Unit.VOLUME },
];

const unit = computed(() => getLangUnit(dialogProduct.value.unit));

const baseUnit = computed(() => {
  switch (dialogProduct.value.unit) {
    case Unit.WEIGHT:
      return language.app.units.kg;
    case Unit.PIECE:
      return language.app.units.pcs;
    case Unit.VOLUME:
      return language.app.units.l;
    default:
      return language.app.units.unit;
  }
});

const onClose = () => {
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveProduct(dialogProduct.value as Required<NewProduct> & OptionalId)
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
        <span class="text-h5">{{ t.product }}</span>
      </v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="dialogProduct.name"
              :label="t.name"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="dialogProduct.description"
              :label="t.description"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-switch
              v-model="dialogProduct.active"
              :label="`${
                dialogProduct.active
                  ? language.app.options.active.true
                  : language.app.options.active.false
              }`"
              color="primary"
            ></v-switch>
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="dialogProduct.productCategoryId"
              :items="productStore.productCategoryOptions"
              :label="t.productCategory"
            ></v-select>
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="dialogProduct.unit"
              :items="unitOptions"
              :label="language.app.units.unit"
            ></v-select>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              type="number"
              v-model="dialogProduct.msrp"
              :label="
                interpolate(t.msrp, {
                  unit: baseUnit,
                })
              "
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              type="number"
              v-model="dialogProduct.frequency"
              :label="t.frequency"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              type="number"
              v-model="dialogProduct.quantity"
              :label="
                interpolate(t.quantity, {
                  unit: baseUnit,
                })
              "
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              type="number"
              v-model="dialogProduct.quantityMin"
              :label="
                interpolate(t.quantityMin, {
                  unit: unit,
                })
              "
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              type="number"
              v-model="dialogProduct.quantityMax"
              :label="
                interpolate(t.quantityMax, {
                  unit: unit,
                })
              "
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              type="number"
              v-model="dialogProduct.quantityStep"
              :label="
                interpolate(t.quantityStep, {
                  unit: unit,
                })
              "
            ></v-text-field>
          </v-col>
        </v-row>
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
