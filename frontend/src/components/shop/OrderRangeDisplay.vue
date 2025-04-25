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
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { computed } from "vue";
import { useConfigStore } from "../../store/configStore";
import { storeToRefs } from "pinia";

const configStore = useConfigStore();
const { config } = storeToRefs(configStore);

const props = defineProps<{
  validFrom: Date | null;
  validTo?: Date | null;
}>();

const prettyDate = (date?: Date | string | null): string => {
  if (date) {
    return format(date, "PP", { locale: de });
  }
  return "nie";
};

const beginDate = computed(() => {
  if (
    props.validFrom &&
    props.validFrom.getTime() > (config.value?.validFrom?.getTime() || 0)
  ) {
    return props.validFrom || config.value?.validTo;
  }
  return config.value?.validFrom;
});

const endDate = computed(() => {
  return props.validTo || configStore.config?.validTo;
});

const weeks = computed(() => {
  if (endDate.value && beginDate.value) {
    return Math.floor(
      (endDate.value.getTime() - beginDate.value.getTime()) /
        1000 /
        60 /
        60 /
        24 /
        7,
    );
  }
  return 0;
});
</script>
<template>
  <v-card variant="outlined" color="primary">
    <v-card-subtitle class="pt-1"
      >Gültigkeitszeitraum der Bedarfsanmeldung</v-card-subtitle
    >
    <v-card-text class="py-1"
      >{{ prettyDate(beginDate) }} bis {{ prettyDate(endDate) }} (ca.
      {{ weeks }} Wochen)</v-card-text
    >
  </v-card>
</template>
