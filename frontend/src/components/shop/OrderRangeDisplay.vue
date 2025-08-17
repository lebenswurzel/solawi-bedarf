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
import { useOrderStore } from "../../store/orderStore";

const configStore = useConfigStore();
const orderStore = useOrderStore();
const { config } = storeToRefs(configStore);
const { modificationOrder } = storeToRefs(orderStore);

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
      <v-card-text class="py-1"
        >Noch
        {{ dayDifference(new Date(), firstThursdayOfDelivery || new Date()) }}
        Tage bis zu deiner ersten Verteilung.</v-card-text
      >
    </template>
    <template v-if="modificationOrder">
      <v-card-text class="py-1">
        Es existiert eine angepasste Bedarfsanmeldung, die ab
        {{ prettyDate(modificationOrder.validFrom) }} gültig ist.
      </v-card-text>
    </template>
  </v-card>
</template>
