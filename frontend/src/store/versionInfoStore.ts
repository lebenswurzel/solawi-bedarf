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
import { ref } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template.ts";
import { VersionInfo } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getVersionInfo } from "../requests/versionInfo.ts";
import { useUiFeedback } from "./uiFeedbackStore.ts";
import { useUserStore } from "./userStore.ts";

export const useVersionInfoStore = defineStore("versionInfo", () => {
  const versionInfo = ref<VersionInfo>();
  const uiFeedback = useUiFeedback();
  const userStore = useUserStore();
  const serverError = ref<string>("");

  const update = async (startTimer = false) => {
    // make sure this function is called with startTime=true exactly once in the app life cycle
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
          setTimeout(() => update(true), serverError.value ? 10000 : 60000);
        }
      });
  };

  return {
    versionInfo,
    serverError,
    update,
  };
});
