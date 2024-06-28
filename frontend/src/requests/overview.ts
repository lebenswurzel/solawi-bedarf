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
import { Unit, UserCategory } from "../../../shared/src/enum";
import { getUrl, verifyResponse } from "./requests";

export interface OverviewItem {
  name: string;
  depot: string;
  alternateDepot?: string;
  msrp: number;
  offer: number;
  offerReason: string;
  category: UserCategory;
  categoryReason: string;
  items: {
    name: string;
    value: number;
    unit: Unit;
    category: number;
  }[];
}

export const getOverview = async (): Promise<OverviewItem[]> => {
  const response = await fetch(getUrl("/overview"), {});

  await verifyResponse(response);

  return (await response.json()).overview;
};
