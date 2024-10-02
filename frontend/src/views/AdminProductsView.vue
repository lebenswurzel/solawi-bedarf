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
import ProductDialog from "../components/ProductDialog.vue";
import ProductCategoryDialog from "../components/ProductCategoryDialog.vue";
import { language } from "../lang/lang.ts";
import { interpolate } from "../lang/template.ts";
import { onMounted, provide } from "vue";
import { useProductStore } from "../store/productStore.ts";
import {
  NewProduct,
  NewProductCategory,
  Product,
  ProductCategory,
} from "../../../shared/src/types";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore.ts";
const t = language.pages.product;

const defaultProductCategory: NewProductCategory = {
  active: false,
};

const defaultProduct: NewProduct = {
  active: false,
};

const configStore = useConfigStore();
const productStore = useProductStore();
const biStore = useBIStore();

const openProductCategory = ref(false);
const openProduct = ref(false);

const dialogProductCategory = ref<NewProductCategory | ProductCategory>({
  ...defaultProductCategory,
});
const dialogProduct = ref<NewProduct | Product>({ ...defaultProduct });

provide("dialogProductCategory", dialogProductCategory);
provide("dialogProduct", dialogProduct);

onMounted(async () => {
  await refresh();
});

const refresh = async () => {
  await productStore.update(configStore.activeConfigId);
  await biStore.update();
};
configStore.$subscribe(refresh);

const onCreateProduct = () => {
  dialogProduct.value = { ...defaultProduct };
  openProduct.value = true;
};

const onEditProduct = (product: Product) => {
  dialogProduct.value = product;
  openProduct.value = true;
};

const onCloseProduct = async () => {
  openProduct.value = false;
  await productStore.update(configStore.activeConfigId);
};

const onCreateProductCategory = () => {
  dialogProductCategory.value = { ...defaultProductCategory };
  openProductCategory.value = true;
};

const onEditProductCategory = (productCategory: ProductCategory) => {
  dialogProductCategory.value = productCategory;
  openProductCategory.value = true;
};

const onCloseProductCategory = async () => {
  openProductCategory.value = false;
  await productStore.update(configStore.activeConfigId);
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title>
      {{ t.title }} - {{ configStore.config?.name }}
    </v-card-title>
    <v-card-subtitle>
      {{
        interpolate(t.subtitle, {
          offers: (12 * biStore.offers).toString(),
        })
      }}
    </v-card-subtitle>
    <v-card-text v-for="productCategory in productStore.productCategories">
      <v-list elevation="1" rounded>
        <v-list-item @click="() => onEditProductCategory(productCategory)">
          <v-list-item-title>{{ productCategory.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{
              interpolate(t.item.subtitle, {
                msrp: Math.round(
                  productCategory.products.reduce((acc, cur) => {
                    acc = acc + (cur.quantity * cur.msrp) / 100;
                    return acc;
                  }, 0),
                ).toString(),
              })
            }}
          </v-list-item-subtitle>
        </v-list-item>
        <v-list-item
          v-for="product in productCategory.products"
          @click="() => onEditProduct(product)"
        >
          {{ product.name }}
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onCreateProductCategory" prepend-icon="mdi-plus">{{
        t.action.createProductCategory
      }}</v-btn>
      <v-btn @click="onCreateProduct" prepend-icon="mdi-plus">{{
        t.action.createProduct
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <ProductDialog :open="openProduct" @close="onCloseProduct" />
  <ProductCategoryDialog
    :open="openProductCategory"
    @close="onCloseProductCategory"
  />
</template>
../../../shared/src/types.ts
