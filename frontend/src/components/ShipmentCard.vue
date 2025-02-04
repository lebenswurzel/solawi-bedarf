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
import { interpolate } from "../../../shared/src/lang/template.ts";
import { computed, ref, watch, watchEffect } from "vue";
import { useUserStore } from "../store/userStore.ts";
import { getShipment } from "../requests/shipment.ts";
import { format, getISOWeek } from "date-fns";
import { useOrderStore } from "../store/orderStore.ts";
import { Id, Shipment } from "../../../shared/src/types.ts";
import { storeToRefs } from "pinia";
import { SeasonPhase, Unit } from "../../../shared/src/enum.ts";
import { useBIStore } from "../store/biStore.ts";
import { valueToDelivered } from "../lib/convert.ts";
import { useConfigStore } from "../store/configStore.ts";
import SeasonText from "./styled/SeasonText.vue";
import { getLangUnit } from "../../../shared/src/util/unitHelper.ts";
import { de } from "date-fns/locale";

const t = language.pages.home;

const props = defineProps<{ seasonPhase: SeasonPhase }>();

const userStore = useUserStore();
const biStore = useBIStore();
const orderStore = useOrderStore();
const shipments = ref<(Shipment & Id)[]>([]);
const configStore = useConfigStore();

const { orderItems, validFrom } = storeToRefs(orderStore);
const { productsById } = storeToRefs(biStore);

const model = ref<number>();
const now = ref<Date>(new Date());
const selectedShippingItems = ref<{ [key: number]: boolean }>({});

const dateOptions = computed(() => {
  if (shipments.value.length) {
    model.value = shipments.value[0].id;
  }
  return shipments.value.map((shipment) => ({
    title: interpolate(t.cards.list.subtitle, {
      kw: getISOWeek(shipment.validFrom).toString(),
    }),
    value: shipment.id,
  }));
});

const shipment = computed(() => {
  return (
    shipments.value.find((s) => s.id == model.value) || {
      description: null,
      shipmentItems: [],
      additionalShipmentItems: [],
      validFrom: new Date(),
    }
  );
});

watch(model, () => {
  selectedShippingItems.value = {};
});

const shipmentItems = computed(() => {
  let displayItems: {
    quantity: number;
    unit: Unit;
    name: string;
    description: string | null;
    isBio: boolean;
    id: number;
  }[] = [];
  for (let shipmentItem of shipment.value.shipmentItems || []) {
    const orderItem = orderItems.value.find(
      (o) => o.productId == shipmentItem.productId,
    );
    if (orderItem) {
      displayItems.push({
        name: productsById.value[orderItem.productId]?.name,
        quantity: valueToDelivered({
          value: orderItem.value,
          multiplicator: shipmentItem.multiplicator,
          conversionFrom: shipmentItem.conversionFrom,
          conversionTo: shipmentItem.conversionTo,
        }),
        unit: shipmentItem.unit,
        description: shipmentItem.description,
        isBio: shipmentItem.isBio,
        id: shipmentItem.productId,
      });
    }
  }
  return displayItems;
});

const additionalShipmentItems = computed(() => {
  let displayItems: {
    quantity: number;
    unit: Unit;
    name: string;
    description: string | null;
    isBio: boolean;
  }[] = [];
  for (let additionalShipmentItem of shipment.value.additionalShipmentItems ||
    []) {
    displayItems.push({
      name: additionalShipmentItem.product,
      quantity: additionalShipmentItem.quantity,
      unit: additionalShipmentItem.unit,
      description: additionalShipmentItem.description,
      isBio: additionalShipmentItem.isBio,
    });
  }
  return displayItems;
});

watchEffect(async () => {
  if (userStore.currentUser?.id && configStore.activeConfigId != -1) {
    await orderStore.update(
      userStore.currentUser.id,
      configStore.activeConfigId,
    );
    const { shipments: requestShipments } = await getShipment(
      userStore.currentUser?.id,
      configStore.activeConfigId,
    );
    shipments.value = requestShipments;
    if (requestShipments.length) {
      model.value = requestShipments[0].id;
    }
    now.value = new Date();
  }
});

const toggleSelection = (id: number) => {
  selectedShippingItems.value[id] = !selectedShippingItems.value[id];
};
const isSelected = (id: number) => !!selectedShippingItems.value[id];
</script>

<template>
  <v-card class="ma-2">
    <v-card-title style="white-space: normal"
      >{{ t.cards.list.title }} <SeasonText
    /></v-card-title>
    <v-card-subtitle
      v-if="dateOptions.length > 0 && validFrom && validFrom < now"
    >
      <v-select
        :items="dateOptions"
        v-model="model"
        variant="outlined"
        hide-details
      >
      </v-select>
    </v-card-subtitle>
    <v-card-subtitle v-else-if="props.seasonPhase >= SeasonPhase.SEASON_PHASE">
      {{
        interpolate(t.cards.list.subtitle, {
          kw: getISOWeek(Date.now()).toString(),
        })
      }}</v-card-subtitle
    >
    <v-card-subtitle v-if="shipment.description" style="white-space: normal">
      {{ shipment.description }}
    </v-card-subtitle>
    <v-card-text v-if="props.seasonPhase >= SeasonPhase.SEASON_PHASE">
      <template
        v-if="
          (additionalShipmentItems.length == 0 && shipmentItems.length == 0) ||
          (validFrom && validFrom > now)
        "
      >
        {{ t.cards.list.text }}
      </template>
      <template v-else>
        <p class="text-medium-emphasis mb-2">{{ t.cards.list.detailText }}</p>
        <v-card variant="outlined" color="primary" prepend-icon="mdi-truck">
          <template v-slot:title
            ><div style="white-space: normal">
              {{
                interpolate(t.cards.list.shipment, {
                  from: format(shipment.validFrom, "EEEE, dd.MM.", {
                    locale: de,
                  }),
                })
              }}
            </div>
          </template>
          <v-card-text class="pa-2">
            <div class="mx-auto" style="max-width: 700px">
              <v-list
                v-if="shipmentItems.length > 0 && validFrom && validFrom < now"
                class="bg-surface-light rounded-lg"
                elevation="4"
              >
                <v-list-item
                  v-for="item of shipmentItems"
                  density="compact"
                  :key="item.id"
                  @click="toggleSelection(item.id)"
                >
                  <template v-slot:append>
                    <v-icon v-if="isSelected(item.id)" color="primary"
                      >mdi-check-circle</v-icon
                    >
                    <v-icon v-else color="grey">mdi-circle-outline</v-icon>
                  </template>
                  <v-list-item-title
                    :class="{ 'opacity-60': isSelected(item.id) }"
                    style="white-space: normal"
                  >
                    {{ item.quantity }}
                    {{ getLangUnit(item.unit) }}
                    {{ item.name }}
                    {{ item.isBio ? "[BIO]" : "" }}
                  </v-list-item-title>
                  <v-list-item-subtitle
                    style="white-space: normal; display: block"
                  >
                    {{ item.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <v-list
                v-if="
                  additionalShipmentItems.length > 0 &&
                  validFrom &&
                  validFrom < now
                "
              >
                {{ t.cards.list.additionalShipment }}
                <v-list-item
                  v-for="item of additionalShipmentItems"
                  density="compact"
                >
                  {{ item.quantity }}
                  {{ getLangUnit(item.unit) }}
                  {{ item.name }}
                  {{ item.isBio ? "[BIO]" : "" }}
                  <v-list-item-subtitle
                    style="white-space: normal; display: block"
                  >
                    {{ item.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-card-text>
        </v-card>
      </template>
    </v-card-text>
    <v-card-text v-else>
      <p>{{ t.cards.list.seasonBefore }}</p>
      <p>{{ t.cards.list.text }}</p>
    </v-card-text>
  </v-card>
</template>
