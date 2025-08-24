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
import { storeToRefs } from "pinia";
import { useOrderStore } from "../../store/orderStore.ts";
import { computed } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";

const orderStore = useOrderStore();
const { category } = storeToRefs(orderStore);

const props = defineProps<{
  compact?: boolean;
  contribution?: UserCategory;
}>();

const categoryOptions = computed(() => {
  return Object.entries(language.app.options.orderUserCategories).map(
    ([key, values]) => ({ value: key, ...values }),
  );
});
</script>
<template>
  <div v-if="props.contribution" class="mb-2">
    Mitgliedschaftsmodell:
    {{ categoryOptions.find((co) => co.value == props.contribution)?.title }}
  </div>
  <v-select
    v-else
    class="mb-5"
    v-model="category"
    :items="categoryOptions"
    item-props
    :hint="categoryOptions.find((co) => co.value == category)?.subtitle"
    persistent-hint
    :label="language.pages.shop.dialog.category.label"
    :density="props.compact ? 'compact' : 'default'"
    :variant="props.compact ? 'outlined' : 'filled'"
  >
  </v-select>
</template>
