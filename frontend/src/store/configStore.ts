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
  RequisitionConfig,
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
  const config = ref<RequisitionConfig>();
  const availableConfigs = ref<AvailableConfig[]>([]);
  const loaded = ref<boolean>(false);
  const externalAuthProvider = ref<boolean>(appConfig.externalAuthProvider);
  const seasonColorClass = ref<string>(seasonColorClasses[0]);

  const clear = () => {
    depots.value = [];
    config.value = undefined;
    loaded.value = false;
    availableConfigs.value = [];
    seasonColorClass.value = seasonColorClasses[0];
  };

  const update = async (changedConfigId?: number) => {
    if (changedConfigId === undefined) {
      // keep the currently selected config unless specified otherwise
      const activeConfigId = parseInt(
        localStorage.getItem("activeConfigId") || "-1",
      );
      changedConfigId =
        config.value?.id || (activeConfigId != -1 ? activeConfigId : undefined);
    }
    const {
      depots: requestDepots,
      config: requestConfig,
      availableConfigs: requestAvailableConfigs,
    } = await getConfig(changedConfigId);
    depots.value = requestDepots;
    config.value = requestConfig;
    loaded.value = true;
    seasonColorClass.value =
      seasonColorClasses[(config.value.id || 0) % seasonColorClasses.length];
    console.log(seasonColorClass.value, changedConfigId);
    availableConfigs.value = requestAvailableConfigs;
    localStorage.setItem("activeConfigId", "" + config.value.id);
  };

  return {
    externalAuthProvider,
    depots,
    config,
    availableConfigs,
    loaded,
    seasonColorClass,
    update,
    clear,
  };
});
