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
import {
  countThursdaysBetweenDates,
  dayDifference,
  getSameOrNextThursday,
} from "../../../../shared/src/util/dateHelper";

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

const firstThursdayOfDelivery = computed(() => {
  if (
    props.validFrom &&
    props.validFrom.getTime() > (config.value?.validFrom?.getTime() || 0)
  ) {
    return getSameOrNextThursday(props.validFrom);
  }
  return config.value?.validFrom;
});

const endDate = computed(() => {
  return props.validTo || configStore.config?.validTo;
});

const deliveries = computed(() => {
  if (endDate.value && firstThursdayOfDelivery.value) {
    return countThursdaysBetweenDates(
      firstThursdayOfDelivery.value,
      endDate.value,
    );
  }
  return 0;
});

const isFirstDeliveryInThePast = computed(() => {
  if (!firstThursdayOfDelivery.value) {
    return false;
  }
  return new Date().getTime() - firstThursdayOfDelivery.value.getTime() > 0;
});

const deliveriesBeforeFirstDelivery = computed(() => {
  if (!firstThursdayOfDelivery.value) {
    return 0;
  }
  return countThursdaysBetweenDates(new Date(), firstThursdayOfDelivery.value);
});
</script>
<template>
  <v-card variant="outlined" color="primary">
    <v-card-subtitle class="pt-1"
      ><strong
        >Gültigkeitszeitraum der Bedarfsanmeldung</strong
      ></v-card-subtitle
    >
    <v-card-text class="py-1"
      >{{ prettyDate(firstThursdayOfDelivery) }} bis
      {{ prettyDate(endDate) }} ({{ deliveries }} Verteilungen)</v-card-text
    >
    <template v-if="!isFirstDeliveryInThePast">
      <v-card-text class="py-1" v-if="deliveriesBeforeFirstDelivery > 0"
        >Es stehen noch {{ deliveriesBeforeFirstDelivery }} Lieferungen vor
        deiner ersten Verteilung aus. Der genaue Orientierungswert wird erst
        kurz vor deiner ersten Lieferung berechnet.
      </v-card-text>
      <v-card-text class="py-1" v-else
        >Deine erste Lieferung steht kurz bevor. Dein Orientierungswert wurde
        auf Grundlage der in den verbleibenden Lieferungen geschätzten
        Liefermengen berechnet.</v-card-text
      >
      <v-card-text class="py-1"
        >Tage bis zur ersten Lieferung:
        {{
          dayDifference(new Date(), firstThursdayOfDelivery || new Date())
        }}</v-card-text
      >
    </template>
  </v-card>
</template>
