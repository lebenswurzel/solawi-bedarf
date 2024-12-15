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
import { language } from "../../../shared/src/lang/lang.ts";
import { useTextContentStore } from "../store/textContentStore";

defineProps(["open"]);

const textContentStore = useTextContentStore();

const emit = defineEmits(["close"]);
const onClose = () => {
  emit("close");
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title class="text-center"> Impressum </v-card-title>
      <v-card-text class="enclosing">
        <div v-html="textContentStore.imprint.content"></div>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn class="text-white" @click="onClose" variant="elevated">
          {{ language.app.actions.close }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.enclosing {
  display: flex;
  justify-content: center;
}
.bodydiv {
  min-width: 0;
  max-width: 780px;
}
p {
  margin-bottom: 1rem;
  font-size: inherit;
  line-height: 1.6;
  text-rendering: optimizeLegibility;
}
hr {
  clear: both;
  max-width: 75rem;
  height: 0;
  margin: 1.25rem auto;
  border-top: 0;
  border-right: 0;
  border-bottom: 1px solid #cacaca;
  border-left: 0;
}
</style>
../store/textContetnStore.ts
