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
import { useConfigStore } from "../../store/configStore";
import { computed } from "vue";

const props = defineProps<{
  plain?: boolean;
}>();

const configStore = useConfigStore();
const { config, seasonColorClass } = storeToRefs(configStore);

const colorClass = computed(() => {
  return props.plain ? "" : seasonColorClass.value;
});
</script>

<template>
  <span :class="colorClass" class="season_text">
    <v-icon v-if="!config?.public" size="x-small">mdi-eye-off-outline</v-icon>
    {{ config?.name || "SAISON??" }}</span
  >
</template>

<style>
.season_text {
  padding: 0 0.1em;
  border-radius: 0.3em;
}
</style>
