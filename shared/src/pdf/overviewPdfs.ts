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
  OrderOverviewApplicant,
  OrderOverviewItem,
  OrderOverviewWithApplicantItem,
  OrderPayment,
  ProductCategoryWithProducts,
} from "../types";
import { interpolate } from "../lang/template";
import { PdfSpec, PdfTable } from "./pdf";
import {
  byKey,
  collect,
  collectArray,
  collectMap,
  grouping,
  groupingBy,
  inLocaleOrder,
} from "../util/utils";
import { language } from "../lang/lang";
import { getLangUnit } from "../util/unitHelper";
import { prettyCompactDate } from "../util/dateHelper";

const t = language.pages.overview;

const unitPostifx = {
  [Unit.PIECE]: "[Stk]",
  [Unit.WEIGHT]: "[g]",
  [Unit.VOLUME]: "[ml]",
};

const csvQuote = (value: string) => {
  return `"${value}"`;
};
interface ProductInfo {
  conversion: number;
  msrp: number;
  offer: number;
  value: number;
  rawMsrp: number;
  rawFrequency: number;
  rawConversion: number;
}

export const generateOverviewCsv = (
  overview: OrderOverviewWithApplicantItem[],
  productCategories: ProductCategoryWithProducts[],
  withApplicant: boolean,
  withProductCategoryId: boolean,
  withPaymentInfo: boolean
) => {
  const fixedHeader = [
    "name",
    "identifier",
    "depot",
    "alternateDepot",
    "msrp",
    "offer",
    "offerReason",
    "category",
    "categoryReason",
    "seasonName",
  ];
  const fixedApplicantHeader = [
    "realName",
    "email",
    "phone",
    "street",
    "postalcode",
    "city",
  ];
  const fixedPaymentHeader = [
    "paymentType",
    "paymentRequired",
    "paymentProcessed",
    "amount",
    "accountHolder",
    "iban",
    "bankName",
  ];
  const dynamicHeader: string[] = [];
  const prices: {
    [key: string]: ProductInfo;
  } = {};

  const getItemKey = (category: number, name: string, unit: Unit) => {
    return withProductCategoryId
      ? `${category}) ${name} ${unitPostifx[unit]}`
      : `${name} ${unitPostifx[unit]}`;
  };

  productCategories.forEach((pc) => {
    pc.products.forEach((p) => {
      const key = getItemKey(p.productCategoryId, p.name, p.unit);
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

  const getApplicantFields = (applicant: OrderOverviewApplicant) => {
    return {
      realName: csvQuote(applicant.realName),
      email: csvQuote(applicant.email),
      phone: applicant.phone ? csvQuote(applicant.phone) : "",
      street: csvQuote(applicant.street),
      postalcode: csvQuote(applicant.postalcode),
      city: csvQuote(applicant.city),
    };
  };

  const getPaymentFields = (payment: OrderPayment) => {
    return {
      paymentType: csvQuote(payment.paymentType),
      paymentRequired: payment.paymentRequired.toString(),
      paymentProcessed: payment.paymentProcessed?.toString() ?? "false",
      amount: payment.amount.toString(),
      accountHolder: csvQuote(payment.bankDetails.accountHolder),
      iban: csvQuote(payment.bankDetails.iban),
      bankName: csvQuote(payment.bankDetails.bankName),
    };
  };
  const data = overview.map((overviewItem) => ({
    name: overviewItem.name,
    identifier: overviewItem.identifier,
    depot: overviewItem.depot,
    alternateDepot: overviewItem.alternateDepot,
    msrp: overviewItem.msrp,
    offer: overviewItem.offer,
    offerReason: csvQuote(overviewItem.offerReason),
    category: overviewItem.category,
    categoryReason: csvQuote(overviewItem.categoryReason),
    seasonName: overviewItem.seasonName,
    ...(withApplicant ? getApplicantFields(overviewItem) : {}),
    ...(withPaymentInfo ? getPaymentFields(overviewItem) : {}),
    ...overviewItem.items.reduce(
      (acc, cur) => {
        const key = getItemKey(cur.category, cur.name, cur.unit);
        acc[key] = cur.value;
        prices[key].value += cur.value;
        return acc;
      },
      {} as { [key: string]: number }
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

  const header = [
    ...fixedHeader,
    ...(withApplicant ? fixedApplicantHeader : []),
    ...(withPaymentInfo ? fixedPaymentHeader : []),
    ...dynamicHeader,
  ];

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

  let summaryLines = "";

  if (withProductCategoryId) {
    // only show product summaries if productCategoryId is set
    // otherwise the data might be inconsistent due to duplicate product names
    const csvMsrp = header
      .map((headerItem) =>
        headerItem == "name" ? "msrp" : prices[headerItem]?.msrp || ""
      )
      .join(",");
    const csvOffer = header
      .map((headerItem) =>
        headerItem == "name" ? "offer" : prices[headerItem]?.offer || ""
      )
      .join(",");
    const csvRawMsrp = header
      .map((headerItem) =>
        headerItem == "name" ? "rawMsrp" : prices[headerItem]?.rawMsrp || ""
      )
      .join(",");
    const csvRawFreq = header
      .map((headerItem) =>
        headerItem == "name"
          ? "rawFrequency"
          : prices[headerItem]?.rawFrequency || ""
      )
      .join(",");
    const csvRawConversion = header
      .map((headerItem) =>
        headerItem == "name"
          ? "rawConversion"
          : prices[headerItem]?.rawConversion || ""
      )
      .join(",");
    const csvConversion = header
      .map((headerItem) =>
        headerItem == "name"
          ? "conversion"
          : prices[headerItem]?.conversion || ""
      )
      .join(",");

    summaryLines =
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
      csvConversion;
  }

  return (
    header.map((h) => `"${h}"`).join(",") + "\n" + csv + "\n" + summaryLines
  );
};

export function generateUserData(
  overview: OrderOverviewItem[],
  productCategories: ProductCategoryWithProducts[],
  seasonName: string
): PdfSpec[] {
  const categories = productCategories.reduce(
    grouping(
      (item) => item.id,
      (item) => item
    ),
    new Map<number, ProductCategoryWithProducts>()
  );

  type GroupedItem = {
    group: string;
    depot: string;
    name: string;
    category: ProductCategoryWithProducts;
    value: number;
    startMonth: string | null;
  };

  const grouped = overview
    .flatMap((overviewItem) =>
      overviewItem.items
        .filter((item) => item.value > 0)
        .map((item) => ({
          group: `${overviewItem.name}\n${overviewItem.depot}`,
          depot: overviewItem.depot,
          name: item.name,
          category: categories.get(item.category)!,
          value: item.value,
          startMonth: overviewItem.startMonth,
        }))
    )
    .reduce(
      groupingBy(
        (item) => item.group,
        collectMap((item) => item.category.name, collectArray())
      ),
      new Map<string, Map<string, GroupedItem[]>>()
    );

  return Array.from(grouped.entries(), ([user, userProducts]) => {
    const [userName, depotName] = user.split("\n");
    // Get months from the first product item (all items for a user have the same months value)
    const firstProduct = Array.from(userProducts.values())[0][0];
    const startMonth = firstProduct.startMonth;
    return {
      receiver: user,
      description: interpolate(t.documents.user.description, {
        season: seasonName,
      }),
      description2: startMonth ? `Gültig ab ${startMonth}` : undefined,
      footerTextRight: `Bedarf Ernteteiler ${userName}`,
      footerTextLeft: `Depot ${depotName}`,
      tables: Array.from(
        userProducts.entries(),
        ([category, products]) =>
          ({
            name: category,
            headers: ["Bezeichnung", "Menge", "geplante Häufigkeit*"],
            widths: ["65%", "15%", "20%"],
            rows: Array.from(products.values(), (item) => {
              const product = item.category.products.find(
                (p) => p.name === item.name
              )!;
              return [
                item.name,
                `${item.value} ${getLangUnit(product.unit)}`,
                `${product.frequency} x`,
              ];
            }).sort(byKey((row) => row[0], inLocaleOrder)),
          }) as PdfTable
      ).sort(byKey((table) => table.name, inLocaleOrder)),
      additionalContent: [
        {
          text: "*) geplante Häufigkeit bezogen auf Gesamtsaison",
          fontSize: 10,
          alignment: "right",
          margin: [0, 20, 0, 5],
        },
      ],
    } as PdfSpec;
  }).sort(byKey((pdf) => pdf.receiver, inLocaleOrder));
}

export function generateDepotData(
  overview: OrderOverviewItem[],
  productCategories: ProductCategoryWithProducts[],
  seasonName: string,
  dateOfInterest?: Date
): PdfSpec[] {
  type Value = {
    depot: string;
    name: string;
    unit: Unit;
    quantity: number;
    category: string;
    frequency: number;
  };

  const categories = productCategories.reduce(
    grouping(
      (item) => item.id,
      (item) => item
    ),
    new Map<number, ProductCategoryWithProducts>()
  );

  const dataByDepotAndProduct = overview
    .flatMap((overviewItem) =>
      overviewItem.items
        .filter((item) => item.value > 0)
        .map((item) => ({
          depot: overviewItem.depot,
          name: item.name,
          category: categories.get(item.category)!,
          value: item.value,
        }))
    )
    .reduce(
      groupingBy(
        (item) => item.depot,
        collectMap(
          (item) => item.category.name,
          collectMap(
            (item) => item.name,
            collect(
              (name: string, first): Value => {
                const product = first.category.products.find(
                  (p) => p.name == name
                )!;
                return {
                  depot: first.depot,
                  name,
                  unit: product.unit,
                  quantity: 0,
                  category: first.category.name,
                  frequency: product.frequency || 1,
                };
              },
              (acc, item) => {
                acc.quantity += item.value;
              }
            )
          )
        )
      ),
      new Map<number, Map<string, Map<string, Value>>>()
    );

  return Array.from(
    dataByDepotAndProduct.entries(),
    ([depot, depotProducts]) =>
      ({
        receiver: depot,
        description: interpolate(t.documents.depot.description, {
          season: seasonName,
        }),
        footerTextLeft: `Anmeldung Depot ${depot}`,
        footerTextRight: dateOfInterest
          ? `Stichtag ${prettyCompactDate(dateOfInterest)}`
          : undefined,
        tables: Array.from(
          depotProducts.entries(),
          ([group, products]) =>
            ({
              name: group,
              headers: ["Bezeichnung", "Menge", "geplante Häufigkeit*"],
              widths: ["60%", "20%", "20%"],
              rows: Array.from(products.values(), (item) => [
                item.name,
                `${item.quantity} ${getLangUnit(item.unit)}`,
                `${item.frequency} x`,
              ]).sort(byKey((row) => row[0], inLocaleOrder)),
            }) as PdfTable
        ).sort(byKey((table) => table.name, inLocaleOrder)),
        additionalContent: [
          {
            text: "*) geplante Häufigkeit bezogen auf Gesamtsaison",
            fontSize: 10,
            alignment: "right",
            margin: [0, 20, 0, 5],
          },
        ],
      }) as PdfSpec
  ).sort(byKey((pdf) => pdf.receiver, inLocaleOrder));
}

export function objectToCsv(data: any[]): string {
  if (!data || !data.length) {
    return "";
  }
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(","),
    ...data.map((obj) =>
      headers
        .map((header) => `"${String(obj[header] || "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  return rows.join("\n");
}
