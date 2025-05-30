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
import {
  ConfigResponse,
  CreateConfigRequest,
  ExistingConfig,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getConfig = async (
  requisitionConfigId?: number,
): Promise<ConfigResponse> => {
  let query = "";
  if (requisitionConfigId !== undefined) {
    query = `?configId=${requisitionConfigId}`;
  }
  const response = await fetch(getUrl(`/config${query}`));

  await verifyResponse(response);

  const raw = await response.json();
  return {
    depots: raw.depots,
    config: {
      id: raw.config.id,
      name: raw.config.name,
      startOrder: new Date(raw.config.startOrder),
      startBiddingRound: new Date(raw.config.startBiddingRound),
      endBiddingRound: new Date(raw.config.endBiddingRound),
      validFrom: new Date(raw.config.validFrom),
      validTo: new Date(raw.config.validTo),
      budget: parseInt(raw.config.budget),
      public: raw.config.public,
    },
    availableConfigs: raw.availableConfigs,
    showSeasonSelectorHint: raw.showSeasonSelectorHint,
  };
};

export const createConfig = async (request: CreateConfigRequest) => {
  const response = await fetch(getUrl("/config"), {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const saveConfig = async (config: ExistingConfig) => {
  const response = await fetch(getUrl("/config"), {
    method: "PUT",
    body: JSON.stringify(config),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const deleteConfig = async (requisitionConfigId: number) => {
  const response = await fetch(
    getUrl(`/config?configId=${requisitionConfigId}`),
    {
      method: "DELETE",
    },
  );
  await verifyResponse(response);
};
