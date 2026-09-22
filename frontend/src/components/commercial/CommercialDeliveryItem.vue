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
import { computed, ref } from "vue";
import {
  EditCommercialDeliveryItem,
  Product,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template.ts";
import { Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { getLangUnit } from "@lebenswurzel/solawi-bedarf-shared/src/util/unitHelper.ts";
import { unitDict } from "../../lib/options.ts";
import {
  formatCentsAsEuro,
  getDefaultUnitPriceCents,
  getLineGrossCents,
} from "@lebenswurzel/solawi-bedarf-shared/src/commercial/pricing.ts";

const t = language.pages.commercial.item;

type ProductOption = { title: string; value: number };

const props = defineProps<{
  item: EditCommercialDeliveryItem;
  products: Product[];
  usedProductIds: number[];
  usedProductNames: string[];
  locked: boolean;
}>();

const open = ref(false);

const freeUnitOptions = [
  { title: language.app.units.pcs, value: Unit.PIECE },
  { title: language.app.units.g, value: Unit.WEIGHT },
  { title: language.app.units.ml, value: Unit.VOLUME },
];

const productOptions = computed((): ProductOption[] =>
  props.products
    .filter(
      (p) =>
        p.id === props.item.productId || !props.usedProductIds.includes(p.id),
    )
    .map((p) => ({ title: p.name, value: p.id })),
);

const selectedProduct = computed(() =>
  props.products.find((p) => p.id === props.item.productId),
);

const isFreeTextProduct = computed(
  () => !props.item.productId && !!props.item.productName?.trim(),
);

const productComboboxValue = computed((): string | ProductOption | null => {
  if (props.item.productId != null) {
    const option = productOptions.value.find(
      (o) => o.value === props.item.productId,
    );
    return option ?? selectedProduct.value?.name ?? null;
  }
  return props.item.productName;
});

const unitOptions = computed(() => {
  if (selectedProduct.value) {
    return unitDict[selectedProduct.value.unit];
  }
  if (isFreeTextProduct.value || props.item.productName) {
    return freeUnitOptions;
  }
  return [];
});

const baseUnit = computed(() => {
  const unit = props.item.unit || selectedProduct.value?.unit;
  switch (unit) {
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

const hasProduct = computed(
  () =>
    props.item.productId != null || !!props.item.productName?.trim(),
);

const lineTotal = computed(() => {
  if (!hasProduct.value || !props.item.unit) {
    return 0;
  }
  return getLineGrossCents(props.item as Required<EditCommercialDeliveryItem>);
});

const applyCatalogProduct = (productId: number) => {
  const product = props.products.find((p) => p.id === productId);
  if (!product) {
    return;
  }
  props.item.productId = productId;
  props.item.productName = null;
  props.item.unit = product.unit;
  props.item.unitPriceCents = getDefaultUnitPriceCents(product);
  props.item.vatRate = product.vatRate ?? 7;
  props.item.conversionFrom = 1;
  props.item.conversionTo = 1;
  props.item.isBio = true;
  props.item.quantity = product.quantityStep || 1;
};

const applyFreeTextProduct = (name: string) => {
  const trimmed = name.trim();
  props.item.productId = null;
  props.item.productName = trimmed || null;
  if (!props.item.unit) {
    props.item.unit = Unit.PIECE;
  }
  props.item.conversionFrom = 1;
  props.item.conversionTo = 1;
};

const onProductInput = (val: string | number | ProductOption | null) => {
  if (val == null || val === "") {
    props.item.productId = null;
    props.item.productName = null;
    return;
  }
  if (typeof val === "object" && "value" in val) {
    applyCatalogProduct(val.value);
    return;
  }
  if (typeof val === "number") {
    applyCatalogProduct(val);
    return;
  }
  const match = props.products.find((p) => p.name === val);
  const isAvailable =
    match &&
    (match.id === props.item.productId ||
      !props.usedProductIds.includes(match.id));
  if (isAvailable) {
    applyCatalogProduct(match.id);
    return;
  }
  const normalized = val.trim().toLowerCase();
  if (
    normalized &&
    props.usedProductNames.includes(normalized) &&
    props.item.productName?.trim().toLowerCase() !== normalized
  ) {
    // Keep previous value if the typed name is already used on another line
    return;
  }
  applyFreeTextProduct(val);
};
</script>

<template>
  <v-container class="px-0 pt-0 pb-4 ma-0" fluid>
    <v-row no-gutters align="center" class="pa-0 ma-0 ga-2">
      <v-col cols="12" md="3">
        <v-combobox
          :label="t.product"
          :items="productOptions"
          :model-value="productComboboxValue"
          @update:model-value="onProductInput"
          :disabled="locked"
          hide-details
        />
      </v-col>
      <v-col cols="6" md="2">
        <v-text-field
          :label="`${t.quantity} [${getLangUnit(item.unit || selectedProduct?.unit)}]`"
          v-model.number="item.quantity"
          type="number"
          :disabled="locked"
          hide-details
        />
      </v-col>
      <v-col cols="6" md="2">
        <v-text-field
          :label="
            interpolate(t.unitPrice, {
              unit: baseUnit,
            })
          "
          v-model.number="item.unitPriceCents"
          type="number"
          :disabled="locked"
          hide-details
        />
      </v-col>
      <v-col cols="4" md="1">
        <v-select
          :label="t.vatRate"
          :items="[
            { title: '7', value: 7 },
            { title: '19', value: 19 },
          ]"
          v-model="item.vatRate"
          :disabled="locked"
          hide-details
        />
      </v-col>
      <v-col cols="4" md="2">
        <v-text-field
          :label="t.total"
          :model-value="formatCentsAsEuro(lineTotal)"
          readonly
          hide-details
        />
      </v-col>
      <v-col cols="4" md="2" class="d-flex align-center ga-2">
        <v-checkbox v-model="item.isBio" :label="t.bio" :disabled="locked" hide-details />
        <v-btn variant="outlined" density="compact" @click="open = !open">
          <v-icon>{{ open ? "mdi-arrow-collapse-up" : "mdi-arrow-expand-down" }}</v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <v-row v-if="open" no-gutters class="pa-0 ma-0 ga-2 mt-2">
      <v-col cols="12" md="4">
        <v-text-field
          :label="t.description"
          v-model="item.description"
          clearable
          :disabled="locked"
          hide-details
        />
      </v-col>
      <v-col cols="4" md="2">
        <v-select
          :label="t.unit"
          :items="unitOptions"
          v-model="item.unit"
          :disabled="locked || !hasProduct"
          hide-details
        />
      </v-col>
      <v-col cols="4" md="2">
        <v-text-field
          label="von"
          v-model.number="item.conversionFrom"
          type="number"
          :disabled="locked"
          hide-details
        />
      </v-col>
      <v-col cols="4" md="2">
        <v-text-field
          label="nach"
          v-model.number="item.conversionTo"
          type="number"
          :disabled="locked"
          hide-details
        />
      </v-col>
    </v-row>
  </v-container>
</template>
