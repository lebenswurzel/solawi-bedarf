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
import { provide, ref } from "vue";
import {
  NewProduct,
  Product,
  ProductCategoryWithProducts,
} from "../../../../shared/src/types";
import { language } from "../../lang/lang";
import {
  convertToBigUnit,
  getLangUnit,
  interpolate,
} from "../../lang/template";
import ProductDialog from "../ProductDialog.vue";
import { useConfigStore } from "../../store/configStore";
import { useProductStore } from "../../store/productStore";
import { storeToRefs } from "pinia";
import { useBIStore } from "../../store/biStore";
const t = language.pages.product.dialog;

const props = defineProps<{
  productCategoryWithProducts: ProductCategoryWithProducts;
}>();

const defaultProduct: NewProduct = {
  active: false,
  productCategoryId: props.productCategoryWithProducts.id,
};

const configStore = useConfigStore();
const productStore = useProductStore();
const biStore = useBIStore();
const openProduct = ref(false);
const { activeConfigId, depots } = storeToRefs(configStore);
const dialogProduct = ref<NewProduct | Product>({ ...defaultProduct });
const { soldByProductId, deliveredByProductIdDepotId } = storeToRefs(biStore);
const search = ref<string>("");

provide("dialogProduct", dialogProduct);

const unit = language.app.units.unit;

const headers = [
  { title: t.name, key: "name" },
  // { title: t.description, key: "description" },
  { title: t.active, key: "active" },
  { title: interpolate(t.msrp, { unit }), key: "msrp" },
  { title: t.frequency, key: "frequency" },
  {
    title: t.deliveries,
    key: "deliveries",
    sortRaw(a: Product, b: Product) {
      return Math.sign(
        calculateDeliveries(a).percentage - calculateDeliveries(b).percentage,
      );
    },
  },
  { title: interpolate(t.sold, { unit }), key: "sold" },
  { title: interpolate(t.quantity, { unit }), key: "quantity" },
  // { title: t.quantityMin, key: "quantityMin" },
  // { title: t.quantityMax, key: "quantityMax" },
  // { title: t.quantityStep, key: "quantityStep" },
  { title: unit, key: "unit" },
  { title: "Bearbeiten", key: "edit" },
];

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
  await productStore.update(activeConfigId.value);
};

const calculateDeliveries = (
  product: Product,
): { display: string; percentage: number } => {
  const deliveredByDepotId =
    deliveredByProductIdDepotId.value[product.id] ?? {};
  const depotIds = Object.keys(deliveredByDepotId).map((key) => parseInt(key));
  const targetDeliveries = depotIds.length * product.frequency;
  const actualDeliveries =
    depots.value
      .filter((d) => depotIds.includes(d.id))
      .map((d) => deliveredByDepotId[d.id].actuallyDelivered)
      .reduce((sum, value) => sum + value, 0) / 100;

  return {
    display: `${actualDeliveries}/${targetDeliveries}`,
    percentage: Math.round((actualDeliveries / (targetDeliveries || 1)) * 100),
  };
};
</script>
<template>
  <v-card variant="tonal">
    <v-card-text>
      <v-row no-gutters>
        <v-col cols="12" sm="7" lg="5">
          <v-text-field
            prepend-inner-icon="mdi-magnify"
            v-model="search"
            variant="underlined"
            label="Suche nach Produkt"
            hide-details
            single-line
            clearable
          />
        </v-col>
        <v-spacer></v-spacer>
        <v-col cols="12" sm="2" class="d-flex">
          <v-spacer></v-spacer>
          <v-btn
            @click="onCreateProduct"
            prepend-icon="mdi-plus"
            variant="plain"
            >{{ language.pages.product.action.createProduct }}</v-btn
          >
        </v-col>
      </v-row>
    </v-card-text>
    <v-data-table
      :headers="headers"
      :items="props.productCategoryWithProducts.products"
      :item-value="(item: Product) => item"
      :items-per-page="10"
      :search="search"
    >
      <template v-slot:item.active="{ item }">
        <v-icon v-if="item.active">mdi-check</v-icon>
        <v-icon v-if="!item.active">mdi-close</v-icon>
      </template>

      <template v-slot:item.deliveries="{ item }">
        {{ calculateDeliveries(item).display }}
        <!-- {{ deliveredByProductIdDepotId[item.id] }} -->
      </template>

      <template v-slot:item.sold="{ item }">
        {{ convertToBigUnit(soldByProductId[item.id].sold, item.unit).value }}
      </template>

      <template v-slot:item.edit="{ item }">
        <v-btn
          icon="mdi-pencil"
          @click="onEditProduct(item)"
          variant="plain"
        ></v-btn>
      </template>
      <template v-slot:item.unit="{ item }">
        {{ getLangUnit(item.unit, true) }}
      </template>
    </v-data-table>
  </v-card>
  <ProductDialog :open="openProduct" @close="onCloseProduct" />
</template>
