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
import { computed } from "vue";

const props = defineProps<{
  type: "success" | "error";
  title?: string;
  linkTo?: string;
  linkText?: string;
}>();

const displayTitle = computed(() => {
  if (props.title) {
    return props.title;
  }
  return props.type === "success"
    ? "Erfolgreich"
    : "Ups, da ist etwas schief gegangen!";
});
</script>

<template>
  <div style="max-width: 400px" class="mx-auto">
    <v-card class="ma-2">
      <v-card-item class="justify-center">
        <v-icon
          :color="type === 'success' ? 'success' : 'error'"
          :icon="
            type === 'success' ? 'mdi-check-bold' : 'mdi-alert-circle-outline'
          "
          size="x-large"
        />
      </v-card-item>
      <v-card-title class="text-center">{{ displayTitle }}</v-card-title>
      <v-card-text class="text-center">
        <slot />
        <div class="text-center mt-4" v-if="linkTo">
          <router-link :to="linkTo">{{
            linkText || (linkTo == "/" ? "Startseite" : "Weiter")
          }}</router-link>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>
