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
import BusyIndicator from "../components/BusyIndicator.vue";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
const t = language.pages.depots;

const defaultDepot: NewDepot = {
  comment: null,
  capacity: null,
  active: false,
};

const depots = ref<Depot[]>([]);
const open = ref(false);
const dialogDepot = ref<NewDepot | Depot>({ ...defaultDepot });
const busy = ref<boolean>(true);
const { setError } = useUiFeedback();

provide("dialogDepot", dialogDepot);

onMounted(async () => {
  await refresh();
});

const refresh = async () => {
  getDepots()
    .then((response) => {
      depots.value = response;
    })
    .catch((e: Error) => {
      console.log(e);
      setError(e.message);
    })
    .finally(() => {
      busy.value = false;
    });
};

const onCreateDepot = () => {
  busy.value = true;
  dialogDepot.value = { ...defaultDepot };
  open.value = true;
};

const onEditDepot = (depot: Depot) => {
  dialogDepot.value = depot;
  open.value = true;
};

const onChangeDepotRank = async (depot: Depot, offset: number) => {
  busy.value = true;
  const update: UpdateDepot = {
    id: depot.id,
    rankDown: offset < 0,
    rankUp: offset > 0,
  };
  updateDepot(update)
    .then(refresh)
    .catch((e: Error) => {
      setError(e.message);
      busy.value = false;
    });
};

const onClose = async () => {
  busy.value = true;
  await refresh();
  open.value = false;
};
</script>

<template>
  <v-card class="ma-4">
    <BusyIndicator :busy="busy" />
    <v-card-title>
      {{ t.title }}
    </v-card-title>
    <v-card-text>
      <transition-group name="list" tag="div">
        <v-card
          v-for="(depotItem, index) in depots"
          :key="depotItem.id"
          variant="text"
          :disabled="busy"
          class="compact"
        >
          <v-card-text class="dense">
            <v-row>
              <v-col cols="2" sm="1">
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
              </v-col>
              <v-col cols="10" sm="7">
                {{ depotItem.name }}
              </v-col>

              <v-col cols="12" sm="4">
                <v-btn-group dense>
                  <v-btn
                    icon="mdi-pencil"
                    color="blue"
                    @click="() => onEditDepot(depotItem)"
                    size="small"
                  />
                  <v-btn
                    icon="mdi-arrow-up"
                    color="grey-darken-1"
                    :disabled="index <= 0"
                    @click="() => onChangeDepotRank(depotItem, -1)"
                    size="small"
                  />
                  <v-btn
                    icon="mdi-arrow-down"
                    color="grey-darken-1"
                    :disabled="index >= depots.length - 1"
                    @click="() => onChangeDepotRank(depotItem, 1)"
                    size="small"
                  />
                </v-btn-group>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </transition-group>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onCreateDepot" prepend-icon="mdi-account-plus-outline">{{
        t.action.createDepot
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <DepotDialog :open="open" @close="onClose" />
</template>

<style>
.list-move {
  transition: transform 0.2s ease;
}

.v-btn-group {
  height: 36px !important;
}

.compact {
  max-width: 1000px;
}

.dense {
  padding: 0.5rem;
}
</style>
