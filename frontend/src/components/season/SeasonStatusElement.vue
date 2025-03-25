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
import { format } from "date-fns/format";
import { computed } from "vue";
import { SeasonPhase } from "../../../../shared/src/enum";
import { useConfigStore } from "../../store/configStore";
import { interpolate } from "../../../../shared/src/lang/template";

const props = defineProps<{ phase: SeasonPhase }>();

const configStore = useConfigStore();

const prettyDate = (date: Date) => {
  if (date) {
    return format(date, "dd.MM.yyyy");
  }
  return "?";
};

type VariantType = "elevated" | "outlined" | "plain";

export type SeasonStatusElement = {
  phase: SeasonPhase;
  title: string;
  description: string;
  dateBegin: Date;
  dateEnd: Date;
  color: string;
  variant: VariantType;
  icon: string;
  addGotoOrderButton: boolean;
};

const status = computed((): SeasonStatusElement => {
  const startOrder = configStore.config?.startOrder!;
  const startBiddingRound = configStore.config?.startBiddingRound!;
  const endBiddingRound = configStore.config?.endBiddingRound!;
  const startSeason = configStore.config?.validFrom!;
  const endSeason = configStore.config?.validTo!;
  const elements = [
    {
      phase: SeasonPhase.FREE_ORDER,
      title: "Bedarfsanmeldung läuft",
      description:
        "Der Bedarf kann angemeldet und bis zum {dateEnd} beliebig angepasst werden",
      dateBegin: startOrder,
      dateEnd: startBiddingRound,
      addGotoOrderButton: true,
      variant: "elevated" as VariantType,
      color: "primary",
      icon: "mdi-cart",
    },
    {
      phase: SeasonPhase.INCREASE_ONLY,
      title: "Bieterrunde läuft",
      description:
        "Vom {dateBegin} bis zum {dateEnd} kann der Bedarf nach oben angepasst werden",
      dateBegin: startBiddingRound,
      dateEnd: endBiddingRound,
      addGotoOrderButton: true,
      variant: "elevated" as VariantType,
      color: "primary",
      icon: "mdi-cart-arrow-up",
    },
    {
      phase: SeasonPhase.ORDER_CLOSED,
      title: "Bedarfsanmeldung geschlossen",
      description:
        "Aktuell kann der Bedarf in der gewählten Saison nicht angepasst werden",
      dateBegin: startBiddingRound,
      dateEnd: endBiddingRound,
      addGotoOrderButton: false,
      variant: "outlined" as VariantType,
      color: "grey",
      icon: "mdi-lock",
    },
    {
      phase: SeasonPhase.BEFORE_SEASON,
      title: "Saison steht bevor",
      description: "Die Saison beginnt am {dateBegin}",
      dateBegin: startSeason,
      dateEnd: endSeason,
      addGotoOrderButton: false,
      color: "primary",
      variant: "outlined" as VariantType,
      icon: "",
    },
    {
      phase: SeasonPhase.ACTIVE_SEASON,
      title: "Die Saison läuft",
      description:
        "Von {dateBegin} bis {dateEnd} bekommst du jeden Donnerstag deinen angemeldeten Bedarf (je nach Verfügbarkeit) in dein Depot geliefert (siehe unten).",
      dateBegin: startSeason,
      dateEnd: endSeason,
      addGotoOrderButton: false,
      color: "primary",
      variant: "outlined" as VariantType,
      icon: "mdi-truck-delivery",
    },
    {
      phase: SeasonPhase.AFTER_SEASON,
      title: "Die Saison ist beendet",
      description:
        "Die gewählte Saison liegt in der Vergangenheit. Bitte wähle oben rechts die aktuelle Saison aus.",
      dateBegin: startSeason,
      dateEnd: endSeason,
      addGotoOrderButton: false,
      color: "primary",
      variant: "outlined" as VariantType,
      icon: "mdi-alert-outline",
    },
  ];

  return elements.find((v) => v.phase === props.phase)!;
});
</script>

<template>
  <v-card
    :prepend-icon="status.icon"
    :color="status.color"
    :title="status.title"
    :variant="status.variant"
  >
    <v-card-text>
      {{
        interpolate(status.description, {
          dateBegin: prettyDate(status.dateBegin),
          dateEnd: prettyDate(status.dateEnd),
        })
      }}
      <p v-if="status.addGotoOrderButton" class="justify-center d-flex">
        <router-link to="/shop">
          <v-btn class="mt-4 my-1" color="secondary" variant="elevated">
            Zur Bedarfsanmeldung
          </v-btn>
        </router-link>
      </p>
    </v-card-text>
  </v-card>
</template>
