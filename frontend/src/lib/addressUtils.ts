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

interface CachedCoordinates {
  format: number;
  coordinates: LatLngTuple | null;
  cachedAt: Date;
}

const getCachedCoordinates = (
  address: string,
): CachedCoordinates | undefined => {
  const cached = localStorage.getItem(`geo_${address}`);
  if (cached) {
    return JSON.parse(cached);
  }
  return undefined;
};

const cacheCoordinates = (address: string, coordinates: LatLngTuple | null) => {
  const cached: CachedCoordinates = {
    format: 1,
    coordinates,
    cachedAt: new Date(),
  };
  localStorage.setItem(`geo_${address}`, JSON.stringify(cached));
};

const convertOldCacheToNewFormat = (address: string) => {
  const cached = localStorage.getItem(`geo_${address}`);
  if (cached !== null) {
    const cachedCoords: LatLngTuple | CachedCoordinates | undefined =
      JSON.parse(cached);
    if (
      Object.keys(cachedCoords as CachedCoordinates).indexOf("format") == -1
    ) {
      // Cache is in old format (just coordinates) so we need to convert it to the new format
      console.log("Converting old cache to new format for address:", address);
      cacheCoordinates(address, cachedCoords as LatLngTuple);
    }
  }
};

/** Nominatim allows at most 1 request per second. Chain so each caller waits for the previous one's slot. */
let slotDone: Promise<void> = Promise.resolve();

const withNominatimRateLimit = <T>(fn: () => Promise<T>): Promise<T> => {
  const waitForThisSlot = slotDone;
  let resolveThisSlot: () => void;
  slotDone = new Promise<void>((resolve) => {
    resolveThisSlot = resolve;
  });

  const run = async (): Promise<T> => {
    await waitForThisSlot;
    try {
      return await fn();
    } finally {
      setTimeout(resolveThisSlot!, 1000);
    }
  };
  return run();
};

export const getAddressCoordinates = async (
  address: string,
): Promise<LatLngTuple | null> => {
  try {
    // Check cache first
    convertOldCacheToNewFormat(address);
    const cachedCoords = getCachedCoordinates(address);
    if (cachedCoords !== undefined) {
      return cachedCoords.coordinates;
    }

    return await withNominatimRateLimit(async () => {
      console.log(`${new Date().toISOString()} Geocoding address: ${address}`);
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
    });
  } catch (error) {
    cacheCoordinates(address, null);
    console.error("Error geocoding address:", error);
    return null;
  }
};
