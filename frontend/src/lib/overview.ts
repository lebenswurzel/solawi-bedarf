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

export const generateUserData = (
  overview: OverviewItem[],
  productCategories: ProductCategoryWithProducts[],
) => {
  const dataByUserAndProductCategory: {
    [key: string]: {
      [key: string]: {
        Bezeichnung: string;
        Einheit: string;
        Menge: number;
        "geplante Häufigkeit": string;
      }[];
    };
  } = {};

  for (let overviewItem of overview) {
    const name = `${overviewItem.name}\n${overviewItem.depot}`;
    for (let item of overviewItem.items) {
      if (item.value > 0) {
        const productCategory = productCategories.find(
          (pc) => pc.id == item.category,
        )!;
        const product = productCategory.products.find(
          (p) => p.name == item.name,
        );
        if (!dataByUserAndProductCategory[name]) {
          dataByUserAndProductCategory[name] = {};
        }
        if (!dataByUserAndProductCategory[name][productCategory.name]) {
          dataByUserAndProductCategory[name][productCategory.name] = [];
        }
        dataByUserAndProductCategory[name][productCategory.name].push({
          Bezeichnung: item.name,
          Einheit: getLangUnit(item.unit),
          Menge: item.value,
          "geplante Häufigkeit": `${product?.frequency || 1} x`,
        });
      }
    }
  }

  return dataByUserAndProductCategory;
};

export const generateDepotData = (
  overview: OverviewItem[],
  productCategories: ProductCategoryWithProducts[],
) => {
  const dataByDepotAndProduct: {
    [key: string]: {
      [key: string]: {
        name: string;
        quantity: number;
        unit: Unit;
        category: string;
        frequency: number;
      };
    };
  } = {};
  const dataByDepotAndProductCategory: {
    [key: string]: {
      [key: string]: {
        Bezeichnung: string;
        Einheit: string;
        Menge: number;
        "geplante Häufigkeit": string;
      }[];
    };
  } = {};

  // aggregate by depot and product
  for (let overviewItem of overview) {
    const depot = overviewItem.depot;
    if (!dataByDepotAndProduct[depot]) {
      dataByDepotAndProduct[depot] = {};
    }
    for (let item of overviewItem.items) {
      if (!dataByDepotAndProduct[depot][item.name]) {
        const productCategory = productCategories.find(
          (pc) => pc.id == item.category,
        )!;
        const product = productCategory.products.find(
          (p) => p.name == item.name,
        );
        dataByDepotAndProduct[depot][item.name] = {
          name: item.name,
          unit: item.unit,
          quantity: 0,
          category: productCategory.name,
          frequency: product?.frequency || 1,
        };
      }
      dataByDepotAndProduct[depot][item.name].quantity += item.value;
    }
  }
  // filter 0 values and order by product category
  const depotKeys = Object.keys(dataByDepotAndProduct);
  for (let depotKey of depotKeys) {
    const items = Object.values(dataByDepotAndProduct[depotKey]);
    const dataByCategory: {
      [key: string]: {
        Bezeichnung: string;
        Einheit: string;
        Menge: number;
        "geplante Häufigkeit": string;
      }[];
    } = {};
    for (let item of items) {
      if (item.quantity > 0) {
        if (!dataByCategory[item.category]) {
          dataByCategory[item.category] = [];
        }
        dataByCategory[item.category].push({
          Bezeichnung: item.name,
          Einheit: getLangUnit(item.unit),
          Menge: item.quantity,
          "geplante Häufigkeit": `${item.frequency} x`,
        });
      }
    }
    const productCategoryKeys = Object.keys(dataByCategory);
    for (let productCategoryKey of productCategoryKeys) {
      if (!dataByDepotAndProductCategory[depotKey]) {
        dataByDepotAndProductCategory[depotKey] = {};
      }
      dataByDepotAndProductCategory[depotKey][productCategoryKey] =
        dataByCategory[productCategoryKey];
    }
  }

  return dataByDepotAndProductCategory;
};
