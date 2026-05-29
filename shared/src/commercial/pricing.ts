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
import { Unit } from "../enum";
import {
  CommercialDeliveryItem,
  CommercialDeliveryTotals,
  Product,
} from "../types";

export const VALID_VAT_RATES = [7, 19] as const;

export const quantityToBigUnits = (quantity: number, unit: Unit): number => {
  return unit === Unit.PIECE ? quantity : quantity / 1000;
};

export const getDefaultUnitPriceCents = (product: Product): number => {
  return product.msrp;
};

export const getSaleQuantityInBigUnits = (
  item: Pick<
    CommercialDeliveryItem,
    "quantity" | "unit" | "conversionFrom" | "conversionTo"
  >,
): number => {
  const base = quantityToBigUnits(item.quantity, item.unit);
  if (item.conversionFrom === item.conversionTo) {
    return base;
  }
  return (base * item.conversionTo) / item.conversionFrom;
};

export const getLineGrossCents = (
  item: Pick<
    CommercialDeliveryItem,
    | "quantity"
    | "unit"
    | "conversionFrom"
    | "conversionTo"
    | "unitPriceCents"
  >,
): number => {
  return Math.round(
    item.unitPriceCents * getSaleQuantityInBigUnits(item),
  );
};

export const splitGrossIntoNetAndVat = (
  grossCents: number,
  vatRate: number,
): { netCents: number; vatCents: number } => {
  const netCents = Math.round(grossCents / (1 + vatRate / 100));
  return {
    netCents,
    vatCents: grossCents - netCents,
  };
};

export const getLineTotals = (
  item: CommercialDeliveryItem,
): { grossCents: number; netCents: number; vatCents: number } => {
  const grossCents = getLineGrossCents(item);
  const { netCents, vatCents } = splitGrossIntoNetAndVat(
    grossCents,
    item.vatRate,
  );
  return { grossCents, netCents, vatCents };
};

export const getDeliveryTotals = (
  items: CommercialDeliveryItem[],
): CommercialDeliveryTotals => {
  const vatByRate: CommercialDeliveryTotals["vatByRate"] = {};
  let netCents = 0;
  let vatCents = 0;
  let grossCents = 0;

  for (const item of items) {
    const line = getLineTotals(item);
    grossCents += line.grossCents;
    netCents += line.netCents;
    vatCents += line.vatCents;
    if (!vatByRate[item.vatRate]) {
      vatByRate[item.vatRate] = { netCents: 0, vatCents: 0 };
    }
    vatByRate[item.vatRate].netCents += line.netCents;
    vatByRate[item.vatRate].vatCents += line.vatCents;
  }

  return { netCents, vatCents, grossCents, vatByRate };
};

export const formatCentsAsEuro = (cents: number): string => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

export const isValidVatRate = (vatRate: number): boolean => {
  return (VALID_VAT_RATES as readonly number[]).includes(vatRate);
};
