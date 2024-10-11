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
const t = language.pages.product;

const props = defineProps<{
  productCategoryWithProducts: ProductCategoryWithProducts;
}>();

const openProductCategory = ref(false);

const dialogProductCategory = ref<ProductCategory>({
  ...props.productCategoryWithProducts,
});

const onEditProductCategory = (productCategory: ProductCategory) => {
  dialogProductCategory.value = { ...productCategory };
  openProductCategory.value = true;
};

const onCloseProductCategory = async () => {
  openProductCategory.value = false;
};
</script>

<template>
  <div>
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
    <v-btn
      @click="() => onEditProductCategory(props.productCategoryWithProducts)"
      variant="plain"
      prepend-icon="mdi-pencil"
      >Kategorie</v-btn
    >
  </div>
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
