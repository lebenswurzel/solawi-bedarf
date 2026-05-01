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
import { formatDate } from "date-fns";

withDefaults(
  defineProps<{
    block?: boolean;
    hint?: string;
    /** Visible caption above the button (replaces a text-field label). */
    label?: string;
  }>(),
  { block: false },
);

const modelValue = defineModel<Date>({ required: true });

const menuOpen = ref(false);
</script>

<template>
  <div>
    <div
      v-if="label"
      class="text-caption text-medium-emphasis mb-1"
    >
      {{ label }}
    </div>
    <v-menu
      v-model="menuOpen"
      :close-on-content-click="false"
      location="bottom"
    >
      <template #activator="{ props: menuActivatorProps }">
        <v-btn
          v-bind="menuActivatorProps"
          variant="outlined"
          prepend-icon="mdi-calendar"
          :block="block"
        >
          {{ formatDate(modelValue, "dd.MM.yyyy") }}
        </v-btn>
      </template>
      <v-date-picker
        v-model="modelValue"
        locale="de-DE"
        @update:model-value="menuOpen = false"
      />
    </v-menu>
    <div
      v-if="hint"
      class="text-body-small text-medium-emphasis mt-2"
    >
      {{ hint }}
    </div>
  </div>
</template>
