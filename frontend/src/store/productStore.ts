/*
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
*/
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { ProductCategoryWithProducts } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getProductCategory } from "../requests/productCategory.ts";

export const useProductStore = defineStore("productStore", () => {
  const productCategories = ref<ProductCategoryWithProducts[]>([]);

  const update = async (configId: number) => {
    productCategories.value = await getProductCategory(configId);
  };

  const clear = () => {
    productCategories.value = [];
  };

  const productCategoryOptions = computed(() =>
    productCategories.value.map((productCategory) => ({
      value: productCategory.id,
      title: productCategory.name,
    })),
  );

  return {
    productCategories,
    productCategoryOptions,
    update,
    clear,
  };
});
