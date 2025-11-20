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
  AvailabilityWeights,
  BIData,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getBI = async (
  configId: number,
  orderId?: number,
  includeForecast?: boolean,
  dateOfInterest?: Date,
): Promise<BIData> => {
  let parameters = "";
  if (orderId) {
    parameters = `&orderId=${orderId}`;
  }
  if (includeForecast) {
    parameters += "&includeForecast=true";
  }
  if (dateOfInterest) {
    parameters += `&dateOfInterest=${dateOfInterest.toISOString()}`;
  }
  const response = await fetch(getUrl(`/bi?configId=${configId}${parameters}`));

  await verifyResponse(response);

  return await response.json();
};

export const getAvailabilityWeights = async (
  configId: number,
  dateOfInterest: Date,
): Promise<AvailabilityWeights> => {
  const response = await fetch(
    getUrl(
      `/bi/availabilityWeights?configId=${configId}&dateOfInterest=${dateOfInterest.toISOString()}`,
    ),
  );
  await verifyResponse(response);
  return await response.json();
};
