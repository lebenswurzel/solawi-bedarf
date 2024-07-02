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
  CapacityByDepotId,
  DeliveredByProductIdDepotId,
  ProductsById,
  SoldByProductId,
} from "../../../shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getBI = async (): Promise<{
  soldByProductId: SoldByProductId;
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId;
  capacityByDepotId: CapacityByDepotId;
  productsById: ProductsById;
  offers: number;
}> => {
  const response = await fetch(getUrl("/bi"));

  await verifyResponse(response);

  return await response.json();
};
