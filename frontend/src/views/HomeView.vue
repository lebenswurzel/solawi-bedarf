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
import { computed, onMounted } from "vue";
import HomeStatsCard from "../components/HomeStatsCard.vue";
import ShipmentCard from "../components/ShipmentCard.vue";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore.ts";
import { useUserStore } from "../store/userStore.ts";
import { interpolate } from "../../../shared/src/lang/template.ts";

const configStore = useConfigStore();
const biStore = useBIStore();
const userStore = useUserStore();

onMounted(async () => {
  await configStore.update();
  await biStore.update(configStore.activeConfigId);
  await userStore.update();
});

const prettyDate = (date: Date) => {
  if (date) {
    return format(date, "dd.MM.yyyy");
  }
  return "?";
};
type VariantType = "elevated" | "outlined" | "plain";

type SeasonStatusElement = {
  title: string;
  description: string;
  descriptionActive: string;
  dateBegin: Date;
  dateEnd: Date;
  color: string;
  variant: VariantType;
  statusText: string;
  isActive: boolean;
  icon: string;
  addGotoOrderButton: boolean;
  showBeginDate: boolean;
  order: number;
};

const seasonStatus = computed((): SeasonStatusElement[] => {
  const now = new Date();
  const startOrder = configStore.config?.startOrder!;
  const startBiddingRound = configStore.config?.startBiddingRound!;
  const endBiddingRound = configStore.config?.endBiddingRound!;
  const startSeason = configStore.config?.validFrom!;
  const endSeason = configStore.config?.validTo!;
  const isSeasonActive = startSeason <= now && now < endSeason;
  const steps = [
    {
      title: "Bedarfsanmeldung",
      description: "Der Bedarf kann angemeldet beliebig angepasst werden",
      descriptionActive:
        "Der Bedarf kann angemeldet und bis zum {dateEnd} beliebig angepasst werden",
      dateBegin: startOrder,
      dateEnd: startBiddingRound,
      addGotoOrderButton: true,
      order: 1,
      isActive: isSeasonActive ? false : undefined,
    },
    {
      title: "Bieterrunde",
      description: "Der Bedarf kann nach oben angepasst werden",
      descriptionActive:
        "Vom {dateBegin} bis zum {dateEnd} kann der Bedarf nach oben angepasst werden",
      dateBegin: startBiddingRound,
      dateEnd: endBiddingRound,
      addGotoOrderButton: true,
      order: 3,
      isActive: isSeasonActive ? false : undefined,
    },
    {
      title: "Saison",
      description:
        "Die Saison beginnt am {dateBegin} und läuft bis zum {dateEnd}",
      descriptionActive:
        "Die Saison läuft noch bis zum {dateEnd}. Immer donnerstags findest du unten die Liste der Nahrungsmittel, welche du in deinem Depot abholen kannst. ",
      dateBegin: startSeason,
      dateEnd: endSeason,
      addGotoOrderButton: false,
      order: 5,
    },
  ].map((v): SeasonStatusElement => {
    const isActive =
      v.isActive === undefined ? v.dateBegin <= now && now < v.dateEnd : false;
    const isPast =
      (v.isActive === false && now > startSeason) || now > v.dateEnd;
    return {
      ...v,
      color: isPast
        ? "grey"
        : isActive
          ? "primary"
          : now < v.dateBegin
            ? "primary"
            : "grey",
      variant: isPast
        ? "plain"
        : isActive
          ? "elevated"
          : v.dateEnd < now
            ? "plain"
            : "outlined",
      statusText: isPast
        ? "abgeschlossen"
        : isActive
          ? "läuft"
          : v.dateBegin > now
            ? "steht bevor"
            : "abgeschlossen",
      isActive,
      icon: isActive ? "mdi-arrow-right" : "",
      showBeginDate: v.dateBegin > now,
    };
  });

  // if no step is active, insert a step for the current date
  if (steps.every((step) => !step.isActive)) {
    const order =
      now > endSeason
        ? 6
        : now > endBiddingRound
          ? 4
          : now > startBiddingRound
            ? 2
            : 0;
    steps.push({
      title: "Aktuell",
      description: "Heute ist der {dateBegin}",
      descriptionActive: "Heute ist der {dateBegin}",
      dateBegin: now,
      dateEnd: now,
      color: "primary",
      variant: "elevated",
      statusText: "",
      isActive: true,
      icon: "mdi-arrow-right",
      addGotoOrderButton: false,
      showBeginDate: false,
      order,
    });
  }

  // return empty list if not al dateBegin values are valid
  if (steps.some((step) => !step.dateBegin)) {
    return [];
  }
  return steps.sort((a, b) => a.order - b.order);
});
</script>

<template>
  <v-card class="ma-4">
    <v-card-title style="white-space: normal">
      Herzlich willkommen zur Bedarfsanmeldung des Solawi-Projektes!
    </v-card-title>

    <v-card-subtitle style="white-space: normal">
      Hier siehst du eine Übersicht über den aktuellen Stand der
      Bedarfsanmeldung
    </v-card-subtitle>
    <v-card-text>
      <v-timeline side="end" class="float-left">
        <v-timeline-item
          v-for="status in seasonStatus"
          :dot-color="status.color"
          :icon="status.icon"
        >
          <v-alert :color="status.color" :variant="status.variant">
            <template v-slot:title
              >{{ status.title }} {{ status.statusText }}</template
            >
            <p>
              {{
                interpolate(
                  status.isActive
                    ? status.descriptionActive
                    : status.description,
                  {
                    dateBegin: prettyDate(status.dateBegin),
                    dateEnd: prettyDate(status.dateEnd),
                  },
                )
              }}
            </p>
            <p
              v-if="status.addGotoOrderButton && status.isActive"
              class="justify-center d-flex"
            >
              <router-link to="/shop">
                <v-btn class="mt-4" color="secondary" variant="elevated">
                  Zur Bedarfsanmeldung
                </v-btn>
              </router-link>
            </p>
          </v-alert>
        </v-timeline-item>
      </v-timeline>
    </v-card-text>
  </v-card>
  <ShipmentCard />
  <HomeStatsCard />
</template>
