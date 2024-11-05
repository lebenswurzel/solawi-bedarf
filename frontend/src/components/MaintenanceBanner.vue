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
import { computed, onMounted, ref } from "vue";
import { buildInfo } from "../../../shared/src/buildInfo";
import { getVersionInfo } from "../requests/versionInfo";
import { VersionInfo } from "../../../shared/src/types";
import { language } from "../lang/lang";
import { useUiFeedback } from "../store/uiFeedbackStore";
import { interpolate } from "../lang/template";
import { useUserStore } from "../store/userStore";

const serverVersionInfo = ref<VersionInfo | undefined>();
const serverError = ref<string>("");
const uiFeedback = useUiFeedback();
const userStore = useUserStore();

const refreshServerVersionInfo = async () => {
  getVersionInfo(userStore.currentUser?.id || 0)
    .then((response: VersionInfo) => {
      serverVersionInfo.value = response;
      if (serverError.value) {
        serverError.value = language.app.maintenance.serverAvailable;
      }
    })
    .catch((e: Error) => {
      uiFeedback.setError("Server error", e);
      serverError.value = interpolate(language.app.maintenance.serverError, {
        message: e.message,
      });
      serverVersionInfo.value = undefined;
    })
    .finally(() => {
      // cyclically check server status
      setTimeout(refreshServerVersionInfo, 60000);
    });
};

onMounted(refreshServerVersionInfo);

const showVersionInfo = computed(() => {
  return (
    serverVersionInfo.value &&
    serverVersionInfo.value?.buildInfo.git.hashShort != buildInfo.git.hashShort
  );
});

const showMaintenanceBanner = computed(() => {
  return serverVersionInfo.value?.buildInfo.maintenance?.enabled ?? false;
});

const reload = () => {
  location.reload();
};
</script>
<template>
  <div v-if="showMaintenanceBanner" class="maintenance banner">
    <p class="bg-yellow message">
      {{
        serverVersionInfo?.buildInfo.maintenance?.message ||
        language.app.maintenance.defaultMessage
      }}
    </p>
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
</template>

<style>
.banner {
  width: 100%;
  padding: 0.5em;
  text-align: center;
  position: sticky;
  top: 60px;
  z-index: 100;
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
</style>
