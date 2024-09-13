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
import { ProductCategoryWithProducts } from "../../../shared/src/types";
import { getLangUnit } from "../lang/template";
import { PdfTable } from "./pdf/pdf.ts";
import { collect, collectMap, grouping, groupingBy } from "./utils.ts";

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

const unitPostifx = {
  [Unit.PIECE]: "[Stk]",
  [Unit.WEIGHT]: "[g]",
  [Unit.VOLUME]: "[ml]",
};

export const generateOverviewCsv = (
  overview: OverviewItem[],
  productCategories: ProductCategoryWithProducts[],
) => {
  const fixedHeader = [
    "name",
    "depot",
    "alternateDepot",
    "msrp",
    "offer",
    "offerReason",
    "category",
    "categoryReason",
  ];
  const dynamicHeader: string[] = [];
  const prices: {
    [key: string]: {
      conversion: number;
      msrp: number;
      offer: number;
      value: number;
      rawMsrp: number;
      rawFrequency: number;
      rawConversion: number;
    };
  } = {};

  productCategories.forEach((pc) => {
    pc.products.forEach((p) => {
      const key = `${p.productCategoryId}) ${p.name} ${unitPostifx[p.unit]}`;
      if (!dynamicHeader.includes(key)) {
        dynamicHeader.push(key);
        const conversion = p.unit == Unit.PIECE ? 100 : 100000;
        prices[key] = {
          conversion: ((p.frequency || 1) * p.msrp) / conversion,
          msrp: 0,
          offer: 0,
          value: 0,
          rawMsrp: p.msrp,
          rawFrequency: p.frequency || 1,
          rawConversion: conversion,
        };
      }
    });
  });

  dynamicHeader.sort();

  const data = overview.map((overviewItem) => ({
    name: overviewItem.name,
    depot: overviewItem.depot,
    alternateDepot: overviewItem.alternateDepot,
    msrp: overviewItem.msrp,
    offer: overviewItem.offer,
    offerReason: `"${overviewItem.offerReason}"`,
    category: overviewItem.category,
    categoryReason: `"${overviewItem.categoryReason}"`,
    ...overviewItem.items.reduce(
      (acc, cur) => {
        const key = `${cur.category}) ${cur.name} ${unitPostifx[cur.unit]}`;
        acc[key] = cur.value;
        prices[key].value += cur.value;
        return acc;
      },
      {} as { [key: string]: number },
    ),
  }));

  const sumOffers = data.reduce((acc, cur) => acc + cur.offer, 0);
  let sumMsrp = 0;
  dynamicHeader.forEach((k) => {
    prices[k].msrp = prices[k].conversion * prices[k].value;
    sumMsrp += prices[k].msrp;
  });
  dynamicHeader.forEach((k) => {
    prices[k].offer = Math.round((prices[k].msrp / sumMsrp) * sumOffers * 12);
    prices[k].msrp = Math.round(prices[k].msrp);
  });

  const header = [...fixedHeader, ...dynamicHeader];

  const csv = data
    .map((item) => {
      return header
        .map((headerItem) => {
          const value = item[headerItem as keyof typeof item];
          return value || "";
        })
        .join(",");
    })
    .join("\n");

  const csvMsrp = header
    .map((headerItem) =>
      headerItem == "name" ? "msrp" : prices[headerItem]?.msrp || "",
    )
    .join(",");
  const csvOffer = header
    .map((headerItem) =>
      headerItem == "name" ? "offer" : prices[headerItem]?.offer || "",
    )
    .join(",");
  const csvRawMsrp = header
    .map((headerItem) =>
      headerItem == "name" ? "rawMsrp" : prices[headerItem]?.rawMsrp || "",
    )
    .join(",");
  const csvRawFreq = header
    .map((headerItem) =>
      headerItem == "name"
        ? "rawFrequency"
        : prices[headerItem]?.rawFrequency || "",
    )
    .join(",");
  const csvRawConversion = header
    .map((headerItem) =>
      headerItem == "name"
        ? "rawConversion"
        : prices[headerItem]?.rawConversion || "",
    )
    .join(",");
  const csvConversion = header
    .map((headerItem) =>
      headerItem == "name"
        ? "conversion"
        : prices[headerItem]?.conversion || "",
    )
    .join(",");

  return (
    header.map((h) => `"${h}"`).join(",") +
    "\n" +
    csv +
    "\n" +
    csvMsrp +
    "\n" +
    csvOffer +
    "\n" +
    csvRawMsrp +
    "\n" +
    csvRawFreq +
    "\n" +
    csvRawConversion +
    "\n" +
    csvConversion
  );
};

export function generateUserData(
  overview: OverviewItem[],
  productCategories: ProductCategoryWithProducts[],
): Map<string, Map<string, PdfTable>> {
  type Value = {
    group: string;
    depot: string;
    name: string;
    category: number;
    value: number;
  };

  const categoryIdToName = productCategories.reduce(
    grouping(
      (item) => item.id,
      (item) => item.name,
    ),
    new Map(),
  );

  return overview
    .flatMap((overviewItem) =>
      overviewItem.items
        .filter((item) => item.value > 0)
        .map((item) => ({
          group: `${overviewItem.name}\n${overviewItem.depot}`,
          depot: overviewItem.depot,
          name: item.name,
          category: item.category,
          value: item.value,
        })),
    )
    .reduce(
      groupingBy<string, Value, Map<string, PdfTable>>(
        (item) => item.group,
        collectMap(
          (item) => categoryIdToName.get(item.category)!,
          collect(
            (category: string) =>
              ({
                name: category,
                headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
                widths: ["80%", "10%", "10%"],
                rows: [],
              }) as PdfTable,
            (acc, item) => {
              const productCategory = productCategories.find(
                (pc) => pc.id == item.category,
              )!;
              const product = productCategory.products.find(
                (p) => p.name == item.name,
              )!;
              return acc.rows.push([
                item.name,
                `${item.value} ${getLangUnit(product.unit)}`,
                `${product.frequency} x`,
              ]);
            },
          ),
        ),
      ),
      new Map(),
    );
}

export function generateDepotData(
  overview: OverviewItem[],
  productCategories: ProductCategoryWithProducts[],
): Map<string, Map<string, PdfTable>> {
  type Key = [string, number, string];
  type Value = {
    depot: string;
    name: string;
    unit: Unit;
    quantity: number;
    category: string;
    frequency: number;
  };

  const dataByDepotAndProduct = overview
    .flatMap((overviewItem) =>
      overviewItem.items.map((item) => ({
        depot: overviewItem.depot,
        name: item.name,
        category: item.category,
        value: item.value,
      })),
    )
    .reduce(
      groupingBy(
        (item) => [item.depot, item.category, item.name],
        collect(
          ([depot, category, name]: Key) => {
            const productCategory = productCategories.find(
              (pc) => pc.id == category,
            )!;
            const product = productCategory.products.find(
              (p) => p.name == name,
            )!;
            return {
              depot,
              name,
              unit: product.unit,
              quantity: 0,
              category: productCategory.name,
              frequency: product.frequency || 1,
            } as Value;
          },
          (acc, item) => {
            acc.quantity += item.value;
          },
        ),
      ),
      new Map(),
    );

  // filter 0 values and group by product category
  return [...dataByDepotAndProduct.values()]
    .filter((item) => item.quantity > 0)
    .reduce(
      groupingBy<string, Value, Map<string, PdfTable>>(
        (item) => item.depot,
        collectMap(
          (item) => item.category,
          collect(
            (category: string) =>
              ({
                name: category,
                headers: ["Bezeichnung", "Menge", "geplante Häufigkeit"],
                widths: ["80%", "10%", "10%"],
                rows: [],
              }) as PdfTable,
            (acc, item) =>
              acc.rows.push([
                item.name,
                `${item.quantity} ${getLangUnit(item.unit)}`,
                `${item.frequency} x`,
              ]),
          ),
        ),
      ),
      new Map(),
    );
}
