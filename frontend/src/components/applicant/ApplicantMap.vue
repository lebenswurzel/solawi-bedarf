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
import { computed, onMounted, ref, watch } from "vue";
import { Applicant } from "../../../../shared/src/types";
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup,
  LIcon,
} from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";
import { icon, LatLngTuple } from "leaflet";
import { useConfigStore } from "../../store/configStore";
import { getOrder } from "../../requests/shop";
import { storeToRefs } from "pinia";
import { useUserStore } from "../../store/userStore";
import { getApplicants } from "../../requests/applicant";
import { ApplicantState } from "../../../../shared/src/enum";
import { getAddressCoordinates } from "../../lib/addressUtils";

const mapCenter = ref([51.0504, 13.7373] as [number, number]); // Center of Dresden
const zoom = ref(10);

interface Marker {
  position: LatLngTuple;
  address: string;
  name: string;
  realName: string;
  depotId: number;
  depotName: string;
}

const loadingProgress = ref<string | null>(null);
const configStore = useConfigStore();
const userStore = useUserStore();
const { activeConfigId, depots } = storeToRefs(configStore);
const { userOptions } = storeToRefs(userStore);

const activeUsers = ref<Applicant[]>([]);
const processedUsers = ref(0);
const isProcessing = ref(false);
const isFullscreen = ref(false);
const allApplicants = ref<Applicant[]>([]);
const failedAddressQueries = ref<Marker[]>([]);
const selectedDepots = ref<number[]>([]);
const selectAllDepots = ref<boolean>(true);

const mapRef = ref<InstanceType<typeof LMap> | null>(null);

// Predefined colors for markers
const markerColors = [
  "red",
  "blue",
  "green",
  "orange",
  "yellow",
  "violet",
  "grey",
  "black",
  "gold",
];

// Get color based on depot ID
const getDepotColor = (depotId: number): string => {
  const depotIndex = relevantDepots.value.map((d) => d.id).indexOf(depotId);
  return markerColors[depotIndex % markerColors.length];
};

const createMarkerIcon = (color: string) => {
  return icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
};

const depotMarkers = ref<Marker[]>([]);

const updateDepotMarkers = async () => {
  console.log("updateDepotMarkers");
  const markers: Marker[] = [];
  for (const depot of relevantDepots.value) {
    if (depot.address) {
      const coords = await getAddressCoordinates(depot.address);
      const marker = {
        position: coords || [0, 0],
        address: depot.address,
        name: depot.name,
        realName: depot.name,
        depotId: depot.id,
        depotName: depot.name,
      };
      if (coords) {
        markers.push(marker);
      } else {
        failedAddressQueries.value.push(marker);
      }
    }
  }
  depotMarkers.value = markers;
};

const markers = computed((): Marker[] => {
  return activeUsers.value.map((applicant) => {
    const address = `${applicant.address.street}, ${applicant.address.postalcode} ${applicant.address.city}, Germany`;
    return {
      position: [0, 0] as LatLngTuple, // Will be updated after geocoding
      address,
      name: applicant.name || "",
      realName: `${applicant.address.firstname} ${applicant.address.lastname}`,
      depotId: (applicant as any).depotId,
      depotName:
        depots.value.find((d) => d.id === (applicant as any).depotId)?.name ||
        "Unbekannt",
    };
  });
});

const relevantDepots = computed(() => {
  const dd = depots.value.filter((d) =>
    markers.value.map((m) => m.depotId).includes(d.id),
  );
  console.log(dd, dd[0]?.name);
  return [...dd];
});

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  // Wait for the transition to complete before triggering resize
  setTimeout(() => {
    mapRef.value?.leafletObject?.invalidateSize();
  }, 300);
};

watch(relevantDepots, () => {
  updateDepotMarkers();
});

onMounted(async () => {
  isProcessing.value = true;
  processedUsers.value = 0;

  allApplicants.value = await getApplicants(ApplicantState.CONFIRMED);

  // Filter applicants to only those with active orders
  const activeApplicants = await Promise.all(
    allApplicants.value.map(async (applicant) => {
      processedUsers.value++;
      // Find matching user by name
      const matchingUser = userOptions.value.find(
        (u) => u.title === applicant.name,
      );
      if (!matchingUser) {
        console.warn(`No matching user found for applicant ${applicant.name}`);
        return null;
      }

      const order = await getOrder(
        matchingUser.value,
        activeConfigId.value,
        false,
        true,
      );
      if (order && order.offer > 0) {
        return { ...applicant, depotId: order.depotId };
      }
      return null;
    }),
  );

  activeUsers.value = activeApplicants.filter(
    (a): a is Applicant & { depotId: number } => a !== null,
  );
  isProcessing.value = false;

  // Geocode addresses to get coordinates
  const total = markers.value.length;
  let current = 0;

  for (const marker of markers.value) {
    try {
      current++;
      loadingProgress.value = `Lade Adresse ${current} von ${total}`;

      const coords = await getAddressCoordinates(marker.address);
      if (coords) {
        marker.position = coords;
      } else {
        failedAddressQueries.value.push(marker);
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  }

  await updateDepotMarkers();
  loadingProgress.value = null;
});

const toggleAllDepots = () => {
  if (selectAllDepots.value) {
    selectedDepots.value = [];
    selectAllDepots.value = false;
  } else {
    selectedDepots.value = [...relevantDepots.value.map((d) => d.id)];
    selectAllDepots.value = true;
  }
};

watch(relevantDepots, () => {
  selectedDepots.value = relevantDepots.value.map((d) => d.id);
});
</script>

<template>
  <div class="map-container" :class="{ fullscreen: isFullscreen }">
    <div v-if="isProcessing" class="loading-overlay">
      Lade aktive Nutzer... ({{ processedUsers }} von
      {{ allApplicants.length }})
    </div>
    <div v-else-if="loadingProgress" class="loading-overlay">
      {{ loadingProgress }}
    </div>
    <v-btn
      icon="mdi-fullscreen"
      variant="plain"
      class="fullscreen-btn"
      @click="toggleFullscreen"
    ></v-btn>
    <LMap
      ref="mapRef"
      v-model:zoom="zoom"
      :center="mapCenter"
      :use-global-leaflet="false"
      class="map"
    >
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      />
      <template v-for="marker in markers">
        <LMarker
          v-if="selectedDepots.includes(marker?.depotId)"
          :key="marker.address"
          :lat-lng="marker.position"
          :icon="createMarkerIcon(getDepotColor(marker.depotId))"
        >
          <LPopup>
            <div>
              <v-btn
                icon="mdi-account-arrow-right"
                variant="plain"
                :to="{ path: `/adminregister/confirmed/${marker.name}` }"
                density="compact"
              ></v-btn>
              <strong>{{ marker.realName }} - </strong>
              <v-btn
                icon="mdi-account-arrow-right"
                variant="plain"
                :to="{ path: `/adminusers/${marker.name}` }"
                density="compact"
              ></v-btn>
              <strong>{{ marker.name }}</strong>
              <br />
              {{ marker.address }}
              <br />
              <strong>Depot:</strong> {{ marker.depotName }}
            </div>
          </LPopup>
        </LMarker>
      </template>
      <template v-for="marker in depotMarkers">
        <LMarker
          v-if="selectedDepots.includes(marker.depotId)"
          :key="`depot-${marker.depotId}`"
          :lat-lng="marker.position"
        >
          <LIcon
            :icon-url="''"
            :icon-size="[32, 32]"
            :icon-anchor="[16, 16]"
            class="depot-icon"
          >
            <template #default>
              <div class="depot-marker">
                <v-icon
                  icon="mdi-store"
                  :color="getDepotColor(marker.depotId)"
                  size="32"
                ></v-icon>
              </div>
            </template>
          </LIcon>
          <LPopup>
            <div>
              <strong>Depot: {{ marker.name }}</strong>
              <br />
              {{ marker.address }}
            </div>
          </LPopup>
        </LMarker>
      </template>
    </LMap>
  </div>
  <v-select
    v-model="selectedDepots"
    :items="relevantDepots"
    multiple
    item-title="name"
    item-value="id"
    density="compact"
  >
    <template v-slot:prepend-item>
      <v-list-item title="Alle auswählen" @click="toggleAllDepots">
        <template v-slot:prepend>
          <v-checkbox-btn :model-value="selectAllDepots"></v-checkbox-btn>
        </template>
      </v-list-item>

      <v-divider class="mt-2"></v-divider>
    </template>
  </v-select>
  <v-alert
    v-if="failedAddressQueries.length > 0"
    color="warning"
    title="Fehlgeschlagene Addressabfragen"
    class="text-caption"
  >
    <p v-for="failedQuery in failedAddressQueries">
      <v-btn
        v-if="failedQuery.name.indexOf('LW') == 0"
        icon="mdi-account-arrow-right"
        variant="plain"
        :to="{ path: `/adminregister/confirmed/${failedQuery.name}` }"
        density="compact"
      ></v-btn>
      {{ failedQuery.realName }} - {{ failedQuery.name }}:
      {{ failedQuery.address }}
    </p>
  </v-alert>
</template>

<style scoped>
.map-container {
  height: 500px;
  width: 100%;
  margin: 20px 0;
  position: relative;
  transition: all 0.3s ease;
}

.map-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
  margin: 0;
  margin-top: 64px;
}

.map {
  height: 100%;
  width: 100%;
}

.loading-overlay {
  color: #333;
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.9) !important;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
