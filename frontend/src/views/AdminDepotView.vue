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
import { getDepots, updateDepot } from "../requests/depot";
import DepotDialog from "../components/DepotDialog.vue";
import { NewDepot, Depot, UpdateDepot } from "../../../shared/src/types";
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
  await refresh();
});

const refresh = async () => {
  depots.value = await getDepots();
};

const onCreateDepot = () => {
  dialogDepot.value = { ...defaultDepot };
  open.value = true;
};

const onEditDepot = (depot: Depot) => {
  dialogDepot.value = depot;
  open.value = true;
};

const onChangeDepotRank = async (depot: Depot, offset: number) => {
  const update: UpdateDepot = {
    id: depot.id,
    rankDown: offset < 0,
    rankUp: offset > 0,
  };
  await updateDepot(update);
  refresh();
};

const onClose = async () => {
  await refresh();
  open.value = false;
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> {{ t.title }} </v-card-title>
    <v-card-text>
      <v-list>
        <v-list-item v-for="(depotItem, index) in depots">
          <v-icon
            icon="mdi-store-off-outline"
            color="grey"
            v-if="!depotItem.active"
          />
          <v-icon
            icon="mdi-store-check"
            color="green"
            v-if="depotItem.active"
          />
          {{ depotItem.name }}

          <v-btn-group style="height: 36px">
            <v-btn
              icon="mdi-pencil"
              color="blue"
              @click="() => onEditDepot(depotItem)"
            />
            <v-btn
              icon="mdi-arrow-up"
              color="grey-darken-1"
              v-if="index > 0"
              @click="() => onChangeDepotRank(depotItem, -1)"
            />
            <v-btn
              icon="mdi-arrow-down"
              color="grey-darken-1"
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
