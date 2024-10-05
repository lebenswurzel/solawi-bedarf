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
import { getConfig } from "../requests/config.ts";
import {
  AvailableConfig,
  Depot,
  ExistingConfig,
} from "../../../shared/src/types.ts";
import { appConfig } from "../../../shared/src/config.ts";

const seasonColorClasses = [
  "bg-primary",
  "bg-secondary",
  "bg-success",
  "bg-info",
  "bg-warning",
  "bg-error",
];

export const useConfigStore = defineStore("config", () => {
  const depots = ref<Depot[]>([]);
  const config = ref<ExistingConfig>();
  const activeConfigId = ref<number>(-1);
  const availableConfigs = ref<AvailableConfig[]>([]);
  const externalAuthProvider = ref<boolean>(appConfig.externalAuthProvider);
  const seasonColorClass = ref<string>(seasonColorClasses[0]);

  const clear = () => {
    depots.value = [];
    config.value = undefined;
    availableConfigs.value = [];
    seasonColorClass.value = seasonColorClasses[0];
  };

  const getConfigOrDefaultConfig = async (configId: number | undefined) => {
    try {
      return await getConfig(configId);
    } catch {
      return await getConfig();
    }
  };

  const update = async (requestedConfigId?: number) => {
    if (requestedConfigId === undefined) {
      // keep the currently selected config unless specified otherwise
      const activeConfigId = parseInt(
        localStorage.getItem("activeConfigId") || "-1",
      );
      requestedConfigId =
        config.value?.id || (activeConfigId != -1 ? activeConfigId : undefined);
    }
    const {
      depots: requestDepots,
      config: requestConfig,
      availableConfigs: requestAvailableConfigs,
    } = await getConfigOrDefaultConfig(requestedConfigId);

    depots.value = requestDepots;
    config.value = requestConfig;
    activeConfigId.value = requestConfig.id;
    seasonColorClass.value =
      seasonColorClasses[(config.value.id || 0) % seasonColorClasses.length];
    availableConfigs.value = requestAvailableConfigs;
    localStorage.setItem("activeConfigId", "" + activeConfigId.value);
  };

  return {
    externalAuthProvider,
    depots,
    config,
    activeConfigId,
    availableConfigs,
    seasonColorClass,
    update,
    clear,
  };
});
