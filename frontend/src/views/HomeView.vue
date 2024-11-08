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
import { onMounted } from "vue";
import HomeStatsCard from "../components/HomeStatsCard.vue";
import ShipmentCard from "../components/ShipmentCard.vue";
import { useBIStore } from "../store/biStore";
import { useConfigStore } from "../store/configStore.ts";
import { useUserStore } from "../store/userStore.ts";

const configStore = useConfigStore();
const biStore = useBIStore();
const userStore = useUserStore();

onMounted(async () => {
  await configStore.update();
  await biStore.update(configStore.activeConfigId);
  await userStore.update();
});
</script>

<template>
  <v-card class="ma-4">
    <v-card-title style="white-space: normal">
      Herzlich willkommen zur Bedarfsanmeldung des Solawi-Projektes!
    </v-card-title>

    <v-card-subtitle style="white-space: normal">
      Du kannst noch bis zum
      {{
        configStore.config?.endBiddingRound &&
        format(configStore.config?.endBiddingRound, "dd.MM.yyyy")
      }}
      Deine <router-link to="/shop">Bedarfsanmeldung</router-link> abgeben und
      bis zum
      {{
        configStore.config?.startBiddingRound &&
        format(configStore.config?.startBiddingRound, "dd.MM.yyyy")
      }}
      Deinen Bedarf beliebig anpassen.
    </v-card-subtitle>
    <router-link to="/shop">
      <v-btn class="ml-5 my-5" color="primary" variant="elevated">
        Zur Bedarfsanmeldung
      </v-btn>
    </router-link>
  </v-card>
  <ShipmentCard />
  <HomeStatsCard />
</template>
