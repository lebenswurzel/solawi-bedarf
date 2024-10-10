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
import { ref, watch } from "vue";
import ProductCategoryDialog from "../components/ProductCategoryDialog.vue";
import { language } from "../lang/lang.ts";
import { interpolate } from "../lang/template.ts";
import { onMounted, provide } from "vue";
import { useProductStore } from "../store/productStore.ts";
import { NewProductCategory, ProductCategory } from "../../../shared/src/types";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore.ts";
import { storeToRefs } from "pinia";
import ProductsTable from "../components/products/ProductsTable.vue";
const t = language.pages.product;

const defaultProductCategory: NewProductCategory = {
  active: false,
  requisitionConfigId: -1,
};

const configStore = useConfigStore();
const productStore = useProductStore();
const biStore = useBIStore();

const { activeConfigId, config } = storeToRefs(configStore);

const openProductCategory = ref(false);

const dialogProductCategory = ref<NewProductCategory | ProductCategory>({
  ...defaultProductCategory,
});

provide("dialogProductCategory", dialogProductCategory);

onMounted(async () => {
  await refresh();
});

watch(activeConfigId, async () => {
  await refresh();
});

const refresh = async () => {
  if (activeConfigId.value < 0) {
    return;
  }
  await productStore.update(activeConfigId.value);
  await biStore.update(activeConfigId.value);
};

const onCreateProductCategory = () => {
  dialogProductCategory.value = {
    ...defaultProductCategory,
    requisitionConfigId: activeConfigId.value,
  };
  openProductCategory.value = true;
};

const onEditProductCategory = (productCategory: ProductCategory) => {
  dialogProductCategory.value = productCategory;
  openProductCategory.value = true;
};

const onCloseProductCategory = async () => {
  openProductCategory.value = false;
  await productStore.update(activeConfigId.value);
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> {{ t.title }} - {{ config?.name }} </v-card-title>
    <v-card-subtitle>
      {{
        interpolate(t.subtitle, {
          offers: (12 * biStore.offers).toString(),
        })
      }}
    </v-card-subtitle>
    <v-card-text>
      <v-expansion-panels
        v-for="productCategory in productStore.productCategories"
        :key="productCategory.id"
      >
        <v-expansion-panel :expanded="true">
          <v-expansion-panel-title
            >{{ productCategory.name }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div>
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
              <v-btn
                @click="() => onEditProductCategory(productCategory)"
                variant="plain"
                prepend-icon="mdi-pencil"
                >Kategorie</v-btn
              >
            </div>
            <ProductsTable :productCategoryWithProducts="productCategory" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onCreateProductCategory" prepend-icon="mdi-plus">{{
        t.action.createProductCategory
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <ProductCategoryDialog
    :open="openProductCategory"
    @close="onCloseProductCategory"
  />
</template>
../../../shared/src/types.ts
