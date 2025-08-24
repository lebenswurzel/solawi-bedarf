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
import { useBIStore } from "../../store/biStore";
import { language } from "../../../../shared/src/lang/lang";
import Markdown from "../design/Markdown.vue";
import { Msrp, SavedOrder } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { computed } from "vue";
import { useOrderStore } from "../../store/orderStore";
import OrderRangeDisplay from "./OrderRangeDisplay.vue";

const biStore = useBIStore();
const { effectiveMsrpByOrderId } = storeToRefs(biStore);
const orderStore = useOrderStore();
const { visibleOrderId } = storeToRefs(orderStore);

const t = language.pages.shop;
const props = defineProps<{
  order: SavedOrder;
  hideOffer?: boolean;
}>();

const isVisibleOrder = computed(() => {
  return visibleOrderId.value == props.order?.id;
});

const msrp = computed((): Msrp => {
  if (!props.order) {
    return {
      monthly: { total: 0, selfgrown: 0, cooperation: 0 },
      yearly: { total: 0, selfgrown: 0, cooperation: 0 },
      months: 0,
    };
  }
  return effectiveMsrpByOrderId.value[props.order.id];
});
</script>
<template>
  <v-card
    :variant="isVisibleOrder ? 'elevated' : 'outlined'"
    :color="isVisibleOrder ? 'primary' : 'blue-grey'"
  >
    <v-card-text class="pb-1 pt-3">
      <v-container fluid class="pa-0">
        <v-row dense>
          <v-col cols="2" sm="1">
            <v-icon size="x-large" v-if="isVisibleOrder"
              >mdi-radiobox-marked</v-icon
            >
            <v-icon
              size="x-large"
              v-else
              @click="
                () =>
                  props.order?.id &&
                  orderStore.setVisibleOrderId(props.order?.id)
              "
              >mdi-radiobox-blank</v-icon
            >
          </v-col>
          <v-col cols="10" sm="11">
            <OrderRangeDisplay :order="props.order" plain />
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
    <v-card-subtitle class="pt-1 text-wrap"
      ><strong>Zusammensetzung des Orientierungswerts</strong> (Werte auf volle
      Euros gerundet, bezogen auf {{ msrp?.months }}
      Kalendermonate)

      <v-tooltip :text="t.cards.products.msrpTooltip" open-on-click>
        <template v-slot:activator="{ props }">
          <v-icon v-bind="props">mdi-information-outline</v-icon>
        </template>
      </v-tooltip>
    </v-card-subtitle>
    <v-card-text class="py-0">
      <Markdown
        :markdown="t.cards.products.msrp"
        :values="{
          total: msrp?.monthly.total.toString(),
        }"
      />
      <Markdown
        class="pl-5"
        :markdown="t.cards.products.msrpSelfgrown"
        :values="{
          selfgrown: msrp?.monthly.selfgrown.toString(),
        }"
      />
      <Markdown
        class="pl-5"
        :markdown="t.cards.products.msrpCooperation"
        :values="{
          cooperation: msrp?.monthly.cooperation.toString(),
        }"
      />
      <Markdown
        class="py-1"
        :markdown="t.cards.products.offer"
        :values="{
          offer: props.order?.offer.toString() || '-',
        }"
        v-if="!props.hideOffer"
      />
    </v-card-text>
    <v-card-text class="py-2" v-if="!props.order.confirmGTC">
      <v-alert
        class="py-2 text-caption font-weight-bold"
        icon="mdi-lightbulb-alert"
        variant="outlined"
      >
        Diese Bedarfsanmeldung ist noch nicht bestätigt und wird erst aktiv,
        wenn sie gespeichert wurde.
        <template v-if="orderStore.currentOrderId"
          >Bis dahin bleibt die bisherige Bedarfsanmeldung bis zum Ende der
          Saison gültig.</template
        >
      </v-alert>
    </v-card-text>
  </v-card>
</template>
