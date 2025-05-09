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
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template.ts";
import ProductCategoryDialog from "../ProductCategoryDialog.vue";
import ProductsTable from "./ProductsTable.vue";
import { deleteProductCategory } from "../../requests/productCategory";
import { useUiFeedback } from "../../store/uiFeedbackStore";
import { useConfigStore } from "../../store/configStore";
import { useProductStore } from "../../store/productStore";
import { sanitizeFileName } from "@lebenswurzel/solawi-bedarf-shared/src/util/fileHelper.ts";
import { objectToCsv } from "@lebenswurzel/solawi-bedarf-shared/src/pdf/overviewPdfs.ts";
import { ProductCategoryType } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
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

const onExportProducts = async () => {
  try {
    const csv = objectToCsv(props.productCategoryWithProducts.products);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeFileName(props.productCategoryWithProducts.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    uiFeedback.setError("" + e);
    throw e;
  }
};

const onDelete = () => {
  deleteProductCategory({ id: props.productCategoryWithProducts.id })
    .then(() => {
      uiFeedback.setSuccess(language.app.uiFeedback.deleting.success);
      productStore.update(configStore.activeConfigId);
    })
    .catch((e: Error) => {
      uiFeedback.setError(language.app.uiFeedback.deleting.failed, e);
    });
};

const onCloseProductCategory = async () => {
  openProductCategory.value = false;
};
</script>

<template>
  <v-row no-gutters>
    <v-col cols="10">
      {{
        language.app.options.productCategoryTyps[
          props.productCategoryWithProducts.typ
        ].title
      }}
      <v-icon>{{
        props.productCategoryWithProducts.typ == ProductCategoryType.COOPERATION
          ? "mdi-truck-delivery"
          : "mdi-sprout"
      }}</v-icon>
      -
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
    <v-col cols="1" class="d-flex">
      <v-spacer></v-spacer>
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
              <v-btn @click="onExportProducts" color="secondary">
                CSV-Export
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
