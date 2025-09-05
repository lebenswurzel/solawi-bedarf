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
import {
  Msrp,
  SavedOrderWithPredecessor,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { computed } from "vue";
import { useOrderStore } from "../../store/orderStore";
import OrderRangeDisplay from "./OrderRangeDisplay.vue";
import ContributionSelect from "./ContributionSelect.vue";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { validateModificationMsrp } from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template";

const biStore = useBIStore();
const orderStore = useOrderStore();
const { visibleOrderId, offer, modificationOrderId } = storeToRefs(orderStore);

const t = language.pages.shop;
const props = defineProps<{
  order: SavedOrderWithPredecessor;
  hideOffer?: boolean;
  showSelector?: boolean;
  fixedContribution?: boolean;
  compareToPrevious?: boolean;
}>();

const isVisibleOrder = computed(() => {
  return visibleOrderId.value == props.order?.id;
});

const isModificationOrder = computed(() => {
  return props.order.id == orderStore.modificationOrderId;
});

const relevantOffer = computed(() => {
  return isModificationOrder.value ? offer.value : props.order.offer;
});

const msrp = computed((): Msrp => {
  if (!props.order) {
    return {
      monthly: {
        total: 0,
        selfgrown: 0,
        cooperation: 0,
        selfgrownCompensation: undefined,
      },
      yearly: {
        total: 0,
        selfgrown: 0,
        cooperation: 0,
        selfgrownCompensation: undefined,
      },
      months: 0,
      contribution: UserCategory.CAT130,
    };
  }
  return biStore.getEffectiveMsrpByOrderId(props.order.id);
});

const previousMsrp = computed((): { msrp: Msrp; offer: number } | null => {
  if (!props.compareToPrevious || !props.order.predecessorId) {
    return null;
  }
  return {
    msrp: biStore.getEffectiveMsrpByOrderId(props.order.predecessorId),
    offer: orderStore.findOrderById(props.order.predecessorId)?.offer ?? 0,
  };
});

const msrpValidation = computed(() => {
  if (!previousMsrp.value) {
    return null;
  }
  return validateModificationMsrp(previousMsrp.value, {
    msrp: msrp.value,
    offer: relevantOffer.value,
  });
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
          <v-col cols="2" sm="1" v-if="props.showSelector">
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
          <v-col :cols="props.showSelector ? 9 : 11" sm="10">
            <OrderRangeDisplay :order="props.order" plain />
          </v-col>
          <v-col cols="1">
            <v-icon v-if="modificationOrderId !== props.order.id"
              >mdi-lock</v-icon
            >
            <v-icon
              v-else
              @click="orderStore.setVisibleOrderId(props.order.id)"
            >
              mdi-pencil
            </v-icon>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
    <v-card-subtitle class="pt-1 text-wrap"
      ><strong>Zusammensetzung des Orientierungswerts</strong> (Werte auf volle
      Euros gerundet, bezogen auf {{ msrp?.months }}
      Kalendermonate)

      <v-tooltip
        :text="t.cards.products.msrpTooltip"
        open-on-click
        location="bottom"
      >
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
      <div class="pl-5">
        {{
          interpolate(t.cards.products.msrpSelfgrown, {
            selfgrown: msrp?.monthly.selfgrown.toString(),
          })
        }}
      </div>
      <div class="pl-5" v-if="msrp?.monthly.selfgrownCompensation">
        +{{
          interpolate(t.cards.products.msrpCompensation, {
            compensation: msrp?.monthly.selfgrownCompensation.toString(),
          })
        }}
      </div>
      <div class="pl-5">
        {{
          interpolate(t.cards.products.msrpCooperation, {
            cooperation: msrp?.monthly.cooperation.toString(),
          })
        }}
      </div>
      <div class="py-1" v-if="!props.hideOffer">
        {{ t.cards.products.offer }}
        <strong class="mr-1">{{ relevantOffer.toString() }} € pro Monat</strong>
        <template v-if="msrpValidation">
          <v-icon v-if="msrpValidation.offerValid" color="success"
            >mdi-check-circle</v-icon
          >
          <v-icon v-else color="warning">mdi-alert</v-icon>
        </template>
      </div>
      <ContributionSelect
        class="mt-2"
        compact
        :contribution="
          isModificationOrder &&
          orderStore.isModifyingOrder &&
          props.fixedContribution !== true
            ? undefined
            : msrp.contribution
        "
      />
      <template v-if="!props.order.confirmGTC">
        <v-alert
          class="py-2 text-caption font-weight-bold mb-2"
          icon="mdi-lightbulb-alert"
          variant="outlined"
        >
          Diese Bedarfsanmeldung ist noch nicht bestätigt und wird erst aktiv,
          wenn sie gespeichert wurde.
          <template v-if="props.order.predecessorId !== null"
            >Bis dahin bleibt die bisherige Bedarfsanmeldung bis zum Ende der
            Saison gültig.</template
          >
        </v-alert>
      </template>
    </v-card-text>
    <template
      v-if="compareToPrevious && msrpValidation && !msrpValidation.allValid"
    >
      <v-alert
        color="info"
        icon="mdi-information-outline"
        title="Es liegen folgende Hinweise vor:"
      >
        <div v-for="error in msrpValidation.errors" :key="error[0]">
          <v-icon class="mr-1">mdi-alert</v-icon>{{ error[0] }}
          <v-tooltip
            :text="error[1]"
            open-on-click
            v-if="error[1]"
            location="bottom"
          >
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props">mdi-information-outline</v-icon>
            </template>
          </v-tooltip>
        </div>
      </v-alert>
    </template>
  </v-card>
</template>
