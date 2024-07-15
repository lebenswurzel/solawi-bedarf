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

export const useConfigStore = defineStore("config", () => {
  const depots = ref<Depot[]>([]);
  const config = ref<RequisitionConfig>();
  const availableConfigs = ref<AvailableConfig[]>([]);
  const loaded = ref<boolean>(false);
  const externalAuthProvider = ref<boolean>(appConfig.externalAuthProvider);

  const clear = () => {
    depots.value = [];
    config.value = undefined;
    loaded.value = false;
    availableConfigs.value = [];
  };

  const update = async () => {
    const {
      depots: requestDepots,
      config: requestConfig,
      availableConfigs: requestAvailableConfigs,
    } = await getConfig();
    depots.value = requestDepots;
    config.value = requestConfig;
    loaded.value = true;
    availableConfigs.value = requestAvailableConfigs;
  };

  return {
    externalAuthProvider,
    depots,
    config,
    availableConfigs,
    loaded,
    update,
    clear,
  };
});
