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
import { onMounted, provide, ref } from "vue";
import { language } from "../lang/lang.ts";
import { getDepots } from "../requests/depot";
import DepotDialog from "../components/DepotDialog.vue";
import { NewDepot, Depot } from "../../../shared/src/types";
const t = language.pages.depots;

const defaultDepot: NewDepot = {
  comment: null,
  capacity: null,
  active: false,
};

const depots = ref<Depot[]>([]);
const open = ref(false);
const dialogDepot = ref<NewDepot | Depot>({ ...defaultDepot });

provide("dialogDepot", dialogDepot);

onMounted(async () => {
  depots.value = await getDepots();
});

const onCreateDepot = () => {
  dialogDepot.value = { ...defaultDepot };
  open.value = true;
};

const onEditDepot = (depot: Depot) => {
  dialogDepot.value = depot;
  open.value = true;
};

const onChangeDepotRank = (__depot: Depot, __offset: number) => {
  alert("Implementierung fehlt");
};

const onClose = async () => {
  depots.value = await getDepots();
  open.value = false;
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> {{ t.title }} </v-card-title>
    <v-card-text>
      <v-list>
        <v-list-item v-for="(depotItem, index) in depots">
          <v-icon icon="mdi-store-off-outline" v-if="!depotItem.active" />
          <v-icon icon="mdi-store-check" v-if="depotItem.active" />
          {{ depotItem.name }}

          <v-btn-group>
            <v-btn icon="mdi-pencil" @click="() => onEditDepot(depotItem)" />
            <v-btn
              icon="mdi-arrow-up"
              v-if="index > 0"
              @click="() => onChangeDepotRank(depotItem, -1)"
            />
            <v-btn
              icon="mdi-arrow-down"
              v-if="index < depots.length - 1"
              @click="() => onChangeDepotRank(depotItem, 1)"
            />
          </v-btn-group>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onCreateDepot" prepend-icon="mdi-account-plus-outline">{{
        t.action.createDepot
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <DepotDialog :open="open" @close="onClose" />
</template>
