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
import {
  ProductCategory,
  ProductCategoryWithProducts,
} from "../../../../shared/src/types";
import { language } from "../../lang/lang";
import { interpolate } from "../../lang/template";
import ProductCategoryDialog from "../ProductCategoryDialog.vue";
import ProductsTable from "./ProductsTable.vue";
import { deleteProductCategory } from "../../requests/productCategory";
import { useUiFeedback } from "../../store/uiFeedbackStore";
import { useConfigStore } from "../../store/configStore";
import { useProductStore } from "../../store/productStore";
const t = language.pages.product;

const props = defineProps<{
  productCategoryWithProducts: ProductCategoryWithProducts;
}>();

const uiFeedback = useUiFeedback();
const configStore = useConfigStore();
const productStore = useProductStore();

const openProductCategory = ref(false);

const dialogProductCategory = ref<ProductCategory>({
  ...props.productCategoryWithProducts,
});

const onEditProductCategory = () => {
  dialogProductCategory.value = { ...props.productCategoryWithProducts };
  openProductCategory.value = true;
};

const onDelete = () => {
  deleteProductCategory({ id: props.productCategoryWithProducts.id })
    .then(() => {
      console.log("DELETE OK");
      uiFeedback.setSuccess(language.app.uiFeedback.deleting.success);
      productStore.update(configStore.activeConfigId);
    })
    .catch((e: Error) => {
      console.log("DELETE KAPUTT");
      uiFeedback.setError(language.app.uiFeedback.deleting.failed, e);
    });
};

const onCloseProductCategory = async () => {
  openProductCategory.value = false;
};
</script>

<template>
  <v-row no-gutters>
    <v-col cols="6">
      {{
        interpolate(t.item.subtitle, {
          msrp: Math.round(
            props.productCategoryWithProducts.products.reduce((acc, cur) => {
              acc = acc + (cur.quantity * cur.msrp) / 100;
              return acc;
            }, 0),
          ).toString(),
        })
      }}
    </v-col>
    <v-spacer></v-spacer>
    <v-col cols="1">
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn variant="plain" icon="mdi-dots-vertical" v-bind="props">
          </v-btn>
        </template>
        <v-list>
          <v-list-item>
            <v-list-item-title>
              <v-btn @click="onEditProductCategory">
                {{ language.app.actions.edit }}
              </v-btn>
            </v-list-item-title>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>
              <v-btn color="error" @click="onDelete">
                {{ language.app.actions.delete }}
              </v-btn>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-col>
  </v-row>
  <ProductsTable
    :productCategoryWithProducts="props.productCategoryWithProducts"
  />
  <ProductCategoryDialog
    v-if="openProductCategory"
    :open="openProductCategory"
    :productCategory="dialogProductCategory"
    @close="onCloseProductCategory"
  />
</template>
