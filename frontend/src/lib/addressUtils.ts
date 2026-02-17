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
import { LatLngTuple } from "leaflet";

const getCachedCoordinates = (
  address: string,
): LatLngTuple | null | undefined => {
  const cached = localStorage.getItem(`geo_${address}`);
  if (cached) {
    return JSON.parse(cached);
  }
  return undefined;
};

const cacheCoordinates = (address: string, coordinates: LatLngTuple | null) => {
  localStorage.setItem(`geo_${address}`, JSON.stringify(coordinates));
};

export const getAddressCoordinates = async (
  address: string,
): Promise<LatLngTuple | null> => {
  try {
    // Check cache first
    const cachedCoords = getCachedCoordinates(address);
    if (cachedCoords !== undefined) {
      return cachedCoords;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
    );
    const data = await response.json();

    if (data && data[0]) {
      const coords: LatLngTuple = [
        parseFloat(data[0].lat),
        parseFloat(data[0].lon),
      ];
      cacheCoordinates(address, coords);
      return coords;
    }
    cacheCoordinates(address, null);
    return null;
  } catch (error) {
    cacheCoordinates(address, null);
    console.error("Error geocoding address:", error);
    return null;
  }
};
