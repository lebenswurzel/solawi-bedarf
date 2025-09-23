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
import { SavedOrder } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import DebugOnly from "../debug/DebugOnly.vue";

const configStore = useConfigStore();
const { config } = storeToRefs(configStore);

const props = defineProps<{
  order: SavedOrder | undefined;
  plain?: boolean;
}>();

const validFrom = computed(() => {
  return props.order?.validFrom;
});
const validTo = computed(() => {
  return props.order?.validTo;
});

const isPastOrder = computed(() => {
  return props.order && props.order?.validTo.getTime() < new Date().getTime();
});
const isFutureOrder = computed(() => {
  return props.order && props.order?.validFrom.getTime() > new Date().getTime();
});

const prettyDate = (date?: Date | string | null): string => {
  if (date) {
    return format(date, "PP", { locale: de });
  }
  return "nie";
};

const firstThursdayOfDelivery = computed(() => {
  if (
    validFrom.value &&
    validFrom.value.getTime() > (config.value?.validFrom?.getTime() || 0)
  ) {
    return getSameOrNextThursday(validFrom.value);
  }
  return config.value?.validFrom;
});

const endDate = computed(() => {
  return validTo.value || config.value?.validTo;
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
  <div>
    <strong>
      <template v-if="isPastOrder"> Vergangene Bedarfsanmeldung </template>
      <template v-else-if="isFutureOrder">
        Zukünftige Bedarfsanmeldung
      </template>
      <template v-else>Aktuelle Bedarfsanmeldung</template>
    </strong>
    <DebugOnly>{{ order?.id }}</DebugOnly>
  </div>

  <div>
    {{ prettyDate(firstThursdayOfDelivery) }} bis {{ prettyDate(endDate) }} ({{
      deliveries
    }}
    Verteilungen)
  </div>
  <template v-if="!isFirstDeliveryInThePast">
    <div class="py-1">
      Noch
      {{ dayDifference(new Date(), firstThursdayOfDelivery || new Date()) }}
      Tage bis zur ersten Verteilung.
    </div>
  </template>
</template>
