/*
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
*/
import { defineStore } from "pinia";
import { computed, onUnmounted, ref } from "vue";
import { VersionInfo } from "../../../shared/src/types.ts";
import { getVersionInfo } from "../requests/versionInfo.ts";
import { useUiFeedback } from "./uiFeedbackStore.ts";
import { useUserStore } from "./userStore.ts";
import { interpolate } from "../../../shared/src/lang/template.ts";
import { language } from "../../../shared/src/lang/lang.ts";

export const useVersionInfoStore = defineStore("versionInfo", () => {
  const versionInfo = ref<VersionInfo>();
  const uiFeedback = useUiFeedback();
  const userStore = useUserStore();
  const serverError = ref<string>("");

  const update = async (startTimer = false) => {
    // make sure this function is called with startTime=true exactly once in the app life cycle
    console.log("update version info store");
    await getVersionInfo(userStore.currentUser?.id || 0)
      .then((response: VersionInfo) => {
        versionInfo.value = response;
        serverError.value = "";
      })
      .catch((e: Error) => {
        uiFeedback.setError("Server error", e);
        serverError.value = interpolate(language.app.maintenance.serverError, {
          message: e.message,
        });
        versionInfo.value = undefined;
      })
      .finally(() => {
        // cyclically check server status
        if (startTimer) {
          setTimeout(() => update(true), 60000);
        }
      });
  };

  const isLoggedIn = computed(() => {
    return !!versionInfo.value?.tokenValidUntil;
  });

  // A reactive "now" variable that updates every second
  const now = ref(new Date());
  const timer = setInterval(() => {
    now.value = new Date();
  }, 1000);

  // Clear the interval if the store is ever unmounted (optional in many apps)
  onUnmounted(() => {
    clearInterval(timer);
  });

  // Computed property for the remaining time in seconds.
  const remainingTimeSeconds = computed(() => {
    if (!versionInfo.value?.tokenValidUntil) return 0;
    const expiry = new Date(versionInfo.value.tokenValidUntil);
    // Calculate the difference in seconds.
    const diffInSeconds = Math.floor(
      (expiry.getTime() - now.value.getTime()) / 1000,
    );
    return diffInSeconds > 0 ? diffInSeconds : 0;
  });

  // Computed property for a human-readable remaining time.
  const remainingTimeHumanized = computed(() => {
    const seconds = remainingTimeSeconds.value;

    if (seconds <= 0) return "Sitzung abgelaufen";
    if (seconds < 60) return `Sitzung läuft in ${seconds} Sekunden ab`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 5)
      return `Sitzung läuft in ${minutes} Minuten und ${seconds % 60} Sekunden ab`;

    if (minutes < 60) return `Sitzung läuft in ${minutes} Minuten ab`;

    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    return `Sitzung läuft in ${hours} Stunden und ${remainderMinutes} Minuten ab`;
  });

  return {
    versionInfo,
    serverError,
    remainingTimeSeconds,
    remainingTimeHumanized,
    isLoggedIn,
    update,
  };
});
