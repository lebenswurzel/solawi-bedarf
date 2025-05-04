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
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { buildInfo } from "@lebenswurzel/solawi-bedarf-shared/src/buildInfo.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { marked } from "marked";
import { useVersionInfoStore } from "../store/versionInfoStore";
import { storeToRefs } from "pinia";
import { useUserStore } from "../store/userStore";
import Login from "./Login.vue";

const versionInfoStore = useVersionInfoStore();
const userStore = useUserStore();
const { versionInfo: serverVersionInfo, serverError } =
  storeToRefs(versionInfoStore);
const {
  currentUser,
  isSessionExpired,
  remainingTokenTimeSeconds,
  remainingTimeHumanized,
} = storeToRefs(userStore);
const showLogin = ref(false);

onMounted(() => versionInfoStore.update(true));

const showVersionInfo = computed(() => {
  return (
    serverVersionInfo.value &&
    serverVersionInfo.value?.buildInfo.git.hashShort != buildInfo.git.hashShort
  );
});

const showMaintenanceBanner = computed(() => {
  return serverVersionInfo.value?.buildInfo.maintenance?.enabled ?? false;
});

const maintenanceMessageHtml = computed(() => {
  return marked.parse(
    serverVersionInfo.value?.buildInfo.maintenance?.message || "",
  );
});

const reload = () => {
  location.reload();
};

watch(isSessionExpired, (value) => {
  if (value) {
    showLogin.value = true;
  }
});
</script>
<template>
  <div
    :class="[
      'logged-in-time',
      remainingTokenTimeSeconds < 60 ? 'pulse-opacity' : '',
    ]"
    v-if="
      remainingTokenTimeSeconds < 900 && currentUser && currentUser?.id !== 0
    "
  >
    <v-sheet
      :color="remainingTokenTimeSeconds < 300 ? 'orange' : 'info'"
      rounded
      class="text-caption ma-1 pa-1"
      elevation="10"
    >
      <v-icon>mdi-timer-alert-outline</v-icon>

      {{ remainingTimeHumanized }}

      <span
        v-if="isSessionExpired"
        class="text-decoration-underline"
        style="cursor: pointer"
        @click="showLogin = true"
        >{{ language.app.status.loginAgain }}</span
      >
    </v-sheet>
  </div>
  <div v-if="showMaintenanceBanner" class="maintenance banner">
    <p class="bg-yellow message" v-html="maintenanceMessageHtml"></p>
  </div>
  <div v-if="showVersionInfo" class="version banner">
    <p class="bg-yellow message">
      {{ language.app.maintenance.inconsistentServerVersion }}
    </p>
    <v-btn
      class="mt-2"
      prepend-icon="mdi-reload"
      variant="elevated"
      color="green"
      @click="reload"
      >{{ language.app.actions.update }}</v-btn
    >
  </div>
  <div v-if="serverError" class="server-error banner">
    <p class="bg-red message">{{ serverError }}</p>
    <v-btn
      class="mt-2"
      prepend-icon="mdi-reload"
      variant="elevated"
      color="red"
      @click="reload"
      >{{ language.app.actions.update }}</v-btn
    >
  </div>
  <div v-if="isSessionExpired" class="session-expired banner">
    <p class="bg-yellow message">
      {{ language.app.status.autoLogout }}
    </p>
    <v-btn
      class="mt-2"
      prepend-icon="mdi-login"
      variant="elevated"
      color="orange"
      @click="showLogin = true"
      >{{ language.pages.login.action.login }}</v-btn
    >
  </div>
  <v-dialog v-model="showLogin" persistent>
    <v-container>
      <v-row justify="center">
        <v-col cols="12" md="8">
          <Login @login-ok="showLogin = false">
            <v-card-subtitle style="white-space: normal">
              {{ language.app.status.autoLogout }}
            </v-card-subtitle>
            <template v-slot:actions>
              <v-btn @click="showLogin = false">{{
                language.app.actions.close
              }}</v-btn></template
            >
          </Login>
        </v-col>
      </v-row>
    </v-container>
  </v-dialog>
</template>

<style>
.banner {
  width: 100%;
  padding: 0.5em;
  text-align: center;
  position: sticky;
  top: 60px;
  z-index: 100;
  opacity: 0.8;
}

.maintenance {
  background-image: repeating-linear-gradient(
    45deg,
    yellow,
    yellow 1em,
    orange 1em,
    orange 2em
  );
}

.banner p.message {
  padding: 0.2em;
  background-color: yellow !important;
}

.version {
  background-image: repeating-linear-gradient(
    45deg,
    #8f8,
    #8f8 1em,
    white 1em,
    white 2em
  );
}
.version p.message {
  background-color: #8f8 !important;
}

.server-error {
  background-image: repeating-linear-gradient(
    45deg,
    red,
    red 1em,
    white 1em,
    white 2em
  );
}
.server-error p.message {
  background-color: red !important;
}

.session-expired {
  background-image: repeating-linear-gradient(
    45deg,
    white,
    white 1em,
    orange 1em,
    orange 2em
  );
}
.session-expired p.message {
  background-color: orange !important;
}

.logged-in-time {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 5000;
}

.pulse-opacity {
  animation: pulseAnimation 1200ms ease-in-out infinite;
}

@keyframes pulseAnimation {
  0% {
    opacity: 1;
  }
  20% {
    opacity: 1;
  }
  60% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
