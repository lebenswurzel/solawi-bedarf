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
import { useUiFeedback } from "../store/uiFeedbackStore";

const uiFeedbackStore = useUiFeedback();
const { error, success } = storeToRefs(uiFeedbackStore);
</script>
<template>
  <v-snackbar
    :model-value="!!error"
    @update:model-value="uiFeedbackStore.clearError"
    color="red"
  >
    <div v-for="line in error?.split('\n')" :key="line" class="feedback-line">
      {{ line }}
    </div>
  </v-snackbar>
  <v-snackbar
    :model-value="!!success"
    @update:model-value="uiFeedbackStore.clearSuccess"
    color="success"
  >
    <div v-for="line in success?.split('\n')" :key="line" class="feedback-line">
      {{ line }}
    </div>
  </v-snackbar>
</template>

<style scoped>
div.feedback-line {
  white-space: pre-wrap;
  text-align: center;
}
</style>
