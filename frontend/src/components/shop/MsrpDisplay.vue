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

const biStore = useBIStore();
const { msrp } = storeToRefs(biStore);

const t = language.pages.shop;

const props = defineProps<{
  offer: number;
  hideOffer?: boolean;
}>();
</script>
<template>
  <v-card variant="outlined" color="blue-grey">
    <v-card-subtitle class="pt-1 text-wrap"
      ><strong>Zusammensetzung des Orientierungswerts</strong> (Werte auf volle
      Euros gerundet, bezogen auf {{ msrp.months }} Kalendermonate)

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
          total: msrp.monthly.total.toString(),
        }"
      />
      <Markdown
        class="pl-5"
        :markdown="t.cards.products.msrpSelfgrown"
        :values="{
          selfgrown: msrp.monthly.selfgrown.toString(),
        }"
      />
      <Markdown
        class="pl-5"
        :markdown="t.cards.products.msrpCooperation"
        :values="{
          cooperation: msrp.monthly.cooperation.toString(),
        }"
      />
      <Markdown
        class="py-1"
        :markdown="t.cards.products.offer"
        :values="{
          offer: props.offer.toString(),
        }"
        v-if="!props.hideOffer"
      />
    </v-card-text>
  </v-card>
</template>
