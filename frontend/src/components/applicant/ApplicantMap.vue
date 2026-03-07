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
import { computed, onMounted, ref, watchEffect } from "vue";
import {
  Depot,
  SavedOrder,
  ApplicantWithOrders,
  UserId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { LMap, LTileLayer, LMarker, LPopup } from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";
import { icon, LatLngTuple } from "leaflet";
import { useConfigStore } from "../../store/configStore";
import { getAllOrders } from "../../requests/shop";
import { storeToRefs } from "pinia";
import { useUserStore } from "../../store/userStore";
import { getApplicants } from "../../requests/applicant";
import { ApplicantState } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { getAddressCoordinates } from "../../lib/addressUtils";
import { prettyDateWithMonthAndYear } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";
import CompactUserTable from "./CompactUserTable.vue";

const mapCenter = ref([51.0504, 13.7373] as [number, number]); // Center of Dresden
const zoom = ref(10);

interface Marker {
  userId: number;
  position: LatLngTuple | null;
  address: string;
  name: string;
  realName: string;
  depotId: number;
  depotName: string;
  orders: SavedOrder[];
  visible: boolean;
}

interface FailedAddressQuery {
  userId: number;
  address: string;
  name: string;
  realName: string;
}

const loadingProgress = ref<string | null>(null);
const configStore = useConfigStore();
const userStore = useUserStore();
const { activeConfigId, depots } = storeToRefs(configStore);
const { userOptions } = storeToRefs(userStore);

const allUsers = ref<ApplicantWithOrders[]>([]);
const processedUsers = ref(0);
const isProcessing = ref(false);
const isFullscreen = ref(false);
const failedAddressQueries = ref<FailedAddressQuery[]>([]);
const selectedDepots = ref<number[]>([]);
const relevantDepots = ref<Depot[]>([]);
const selectAllDepots = ref<boolean>(true);

const visibleUsers = ref<UserId[]>([]);

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
  "purple",
  "cyan",
  "chocolate",
  "greenyellow",
];

// Get color based on depot ID
const getDepotColor = (depotId: number): string => {
  if (depotId == 0) return "white";
  const depotIndex = relevantDepots.value.map((d) => d.id).indexOf(depotId);
  return markerColors[depotIndex % markerColors.length];
};

const createMarkerIcon = (color: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="${color}" stroke="#666" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const createDepotIcon = (color: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <rect x="0" y="0" width="24" height="24" fill="white" stroke="#888888" stroke-width="1"/>
      <path fill="${color}" d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
    </svg>
  `;
  return icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Persist geocoded positions by address so they survive computed re-runs and are shared between user and depot markers
const markerPositionsByAddress = ref<Record<string, LatLngTuple | null>>({});
const geocodingInFlight = ref<Set<string>>(new Set());

const normalizeDepotAddress = (depotAddress: string): string => {
  if (depotAddress.includes(":")) {
    return depotAddress.split(":")[1].trim();
  }
  return depotAddress;
};

const depotMarkers = computed((): Marker[] => {
  const positions = markerPositionsByAddress.value;
  const result: Marker[] = [];
  for (const depot of relevantDepots.value) {
    if (!depot.address) continue;
    const address = normalizeDepotAddress(depot.address);
    const position = positions[address] ?? null;
    if (position) {
      result.push({
        userId: 0,
        position,
        address: depot.address,
        name: depot.name,
        realName: depot.name,
        depotId: depot.id,
        depotName: depot.name,
        orders: [],
        visible: true,
      });
    }
  }
  return result;
});

const isVisible = (applicant: ApplicantWithOrders): boolean => {
  return (
    selectedDepots.value.includes(applicant.orders[0]?.depotId || 0) ||
    visibleUsers.value.includes(applicant.userId)
  );
};

const markers = computed((): Marker[] => {
  const positions = markerPositionsByAddress.value;
  return allUsers.value.map((applicant) => {
    const userId = applicant.userId;
    const address = `${applicant.address.street}, ${applicant.address.postalcode} ${applicant.address.city}, Germany`;
    const depotId = applicant.orders[0]?.depotId || 0;
    return {
      userId,
      position: positions[address] ?? null,
      address,
      name: applicant.name || "",
      realName: `${applicant.address.firstname} ${applicant.address.lastname}`,
      depotId: depotId || 0,
      depotName:
        depots.value.find((d) => d.id === depotId)?.name || "Unbekannt",
      orders: applicant.orders,
      visible: isVisible(applicant),
    };
  });
});

const usersWithoutOrders = computed(() => {
  return allUsers.value.filter((user) => user.orders.length === 0);
});

// On-demand geocoding: fetch coordinates only for addresses not yet in cache (users and depots)
watchEffect(() => {
  const cache = markerPositionsByAddress.value;
  const inFlight = geocodingInFlight.value;

  const geocodeAddress = (address: string, onFailure: () => void) => {
    if (address in cache || inFlight.has(address)) return;
    inFlight.add(address);
    getAddressCoordinates(address)
      .then((coords) => {
        markerPositionsByAddress.value = {
          ...markerPositionsByAddress.value,
          [address]: coords,
        };
        if (!coords) onFailure();
      })
      .catch((error) => {
        markerPositionsByAddress.value = {
          ...markerPositionsByAddress.value,
          [address]: null,
        };
        console.error("Error geocoding address:", error);
      })
      .finally(() => {
        const prev = geocodingInFlight.value;
        const next = new Set(prev);
        next.delete(address);
        geocodingInFlight.value = next;
      });
  };

  for (const applicant of allUsers.value) {
    if (!isVisible(applicant)) continue;
    const address = `${applicant.address.street}, ${applicant.address.postalcode} ${applicant.address.city}, Germany`;
    geocodeAddress(address, () => {
      failedAddressQueries.value.push({
        userId: applicant.userId,
        address,
        name: applicant.name || "",
        realName: `${applicant.address.firstname} ${applicant.address.lastname}`,
      });
    });
  }

  for (const depot of relevantDepots.value) {
    if (!depot.address) continue;
    const address = normalizeDepotAddress(depot.address);
    geocodeAddress(address, () => {
      failedAddressQueries.value.push({
        userId: 0,
        address: depot.address!,
        name: depot.name,
        realName: depot.name,
      });
    });
  }
});

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  // Wait for the transition to complete before triggering resize
  setTimeout(() => {
    mapRef.value?.leafletObject?.invalidateSize();
  }, 300);
};

onMounted(async () => {
  isProcessing.value = true;
  processedUsers.value = 0;

  const allApplicants = await getApplicants(ApplicantState.CONFIRMED);

  const depotIds: Set<number> = new Set();
  // Filter applicants to only those with active orders
  const activeApplicants: ApplicantWithOrders[] = (
    await Promise.all(
      allApplicants.map(async (applicant) => {
        processedUsers.value++;
        // Find matching user by name
        const matchingUser = userOptions.value.find(
          (u) => u.title === applicant.name,
        );
        if (!matchingUser) {
          console.warn(
            `No matching user found for applicant ${applicant.name}`,
          );
          return null;
        }

        const orders = await getAllOrders(
          matchingUser.value,
          activeConfigId.value,
          true,
          true,
        );
        if (orders && orders.some((o) => o.offer > 0)) {
          depotIds.add(orders[0].depotId);
          return { ...applicant, orders, userId: matchingUser.value };
        }

        // user without orders
        return { ...applicant, userId: matchingUser.value, orders: [] };
      }),
    )
  ).filter((a) => a !== null);

  relevantDepots.value = depots.value.filter((d) => depotIds.has(d.id));
  selectedDepots.value = relevantDepots.value.map((d) => d.id);

  allUsers.value = [...activeApplicants];
  isProcessing.value = false;
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
</script>

<template>
  <div class="map-container" :class="{ fullscreen: isFullscreen }">
    <div v-if="geocodingInFlight.size > 0" class="loading-overlay">
      Lade Addressen... ({{ geocodingInFlight.size }} verbleibend)
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
      <template v-for="marker in markers" :key="marker.userId">
        <LMarker
          v-if="marker.position && marker.visible"
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
              <br />
              <strong>Bedarfsanmeldungen:</strong> {{ marker.orders.length }}
              <v-btn
                icon="mdi-storefront-outline"
                variant="plain"
                :to="{ path: `/shop/${marker.userId}` }"
                size="x-small"
                class="ma-0 pa-0"
              ></v-btn>
              <br />
              <template v-for="order in marker.orders" :key="order.id">
                <li class="order-list-item">
                  ab {{ prettyDateWithMonthAndYear(order.validFrom) }}:
                  {{ order.offer }} €
                </li>
              </template>
            </div>
          </LPopup>
        </LMarker>
      </template>
      <template v-for="marker in depotMarkers" :key="`depot-${marker.depotId}`">
        <LMarker
          v-if="marker.visible && marker.position"
          :lat-lng="marker.position!"
          :icon="createDepotIcon(getDepotColor(marker.depotId))"
        >
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
    chips
    clearable
    closable-chips
    label="Depots"
  >
    <template v-slot:prepend-item>
      <v-list-item title="Alle auswählen" @click="toggleAllDepots">
        <template v-slot:prepend>
          <v-checkbox-btn :model-value="selectAllDepots"></v-checkbox-btn>
        </template>
      </v-list-item>

      <v-divider class="mt-2"></v-divider>
    </template>

    <template v-slot:chip="{ props, item }">
      <v-chip v-bind="props">{{ item.name }}</v-chip>
    </template>
  </v-select>

  <v-expansion-panels class="mb-2">
    <v-expansion-panel>
      <v-expansion-panel-title>
        Benutzer ohne Bestellungen ({{ visibleUsers.length }} ausgewählt)
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <CompactUserTable
          :users="usersWithoutOrders"
          v-model="visibleUsers"
          :failedAddressUserIds="failedAddressQueries.map((f) => f.userId)"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>

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

.order-list-item {
  list-style-type: none;
  margin: 0;
  padding: 0;
}
</style>
