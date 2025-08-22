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

const biStore = useBIStore();
const { msrpByOrderId, effectiveMsrp } = storeToRefs(biStore);
const orderStore = useOrderStore();
const { modificationOrderId } = storeToRefs(orderStore);

const t = language.pages.shop;

const msrp = computed((): Msrp => {
  if (!props.order) {
    return {
      monthly: { total: 0, selfgrown: 0, cooperation: 0 },
      yearly: { total: 0, selfgrown: 0, cooperation: 0 },
      months: 0,
    };
  }
  if (effectiveMsrp.value && modificationOrderId.value == props.order.id) {
    return effectiveMsrp.value;
  }
  return msrpByOrderId.value[props.order.id];
});

const props = defineProps<{
  order: SavedOrder | undefined;
  hideOffer?: boolean;
}>();
</script>
<template>
  <v-card variant="outlined" color="blue-grey">
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
  </v-card>
</template>
