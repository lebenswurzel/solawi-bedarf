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
import { parseISO, formatISO } from "date-fns";

export const dateToString = (date: Date) => {
  const isoDateString = formatISO(date);
  return isoDateString.substring(0, 16);
};

export const stringToDate = (date: string) => {
  return date && parseISO(date);
};

export const valueToDelivered = ({
  value,
  multiplicator,
  conversionFrom,
  conversionTo,
}: {
  value: number;
  multiplicator: number;
  conversionFrom: number;
  conversionTo: number;
}) => {
  return (value * multiplicator * conversionTo) / (100 * conversionFrom);
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffledArray = [...array]; // Create a copy of the original array

  // Fisher-Yates shuffle algorithm
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }

  return shuffledArray;
}

export const splitTotal = (
  values: { depotId: number; value: number }[],
  total: number,
) => {
  const totalValue = values.reduce((acc, cur) => acc + cur.value, 0);
  if (totalValue === 0) {
    return values.map((v) => ({
      depotId: v.depotId,
      value: 0,
    }));
  }
  const splitedValues = values.map((v) => {
    const splited = (total * v.value) / totalValue;
    const iPart = Math.floor(splited);
    const fPart = splited - iPart;
    return {
      depotId: v.depotId,
      iPart,
      fPart,
    };
  });
  const shuffledSortedArray = shuffleArray(splitedValues).sort((v1, v2) => {
    if (v1.fPart < v2.fPart) {
      return 1;
    }
    if (v1.fPart > v2.fPart) {
      return -1;
    }
    return 0;
  });
  const remainingTotal =
    total - shuffledSortedArray.reduce((acc, cur) => acc + cur.iPart, 0);
  return shuffledSortedArray.map((v, i) => ({
    depotId: v.depotId,
    value: v.iPart + (i < remainingTotal ? 1 : 0),
  }));
};
