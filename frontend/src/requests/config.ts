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
import { Depot, RequisitionConfig } from "../../../shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getConfig = async (): Promise<{
  depots: Depot[];
  config: RequisitionConfig;
}> => {
  const response = await fetch(getUrl("/config"));

  await verifyResponse(response);

  const raw = await response.json();
  return {
    depots: raw.depots,
    config: {
      name: raw.config.name,
      startOrder: new Date(raw.config.startOrder),
      startBiddingRound: new Date(raw.config.startBiddingRound),
      endBiddingRound: new Date(raw.config.endBiddingRound),
      validFrom: new Date(raw.config.validFrom),
      validTo: new Date(raw.config.validTo),
      budget: parseInt(raw.config.budget),
    },
  };
};

export const saveConfig = async (config: RequisitionConfig) => {
  const response = await fetch(getUrl("/config"), {
    method: "POST",
    body: JSON.stringify(config),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};
