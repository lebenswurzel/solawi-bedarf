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
  Depot,
  OrganizationInfo,
  Product,
  ProductCategoryWithProducts,
  ProductsById,
  Shipment,
  ShipmentItem,
} from "../../../../shared/src/types";
import { multiplicatorOptions } from "../options";
import { format } from "date-fns";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import {
  byKey,
  findDepotNameById,
  getOrCompute,
  inLocaleOrder,
} from "../../../../shared/src/util/utils.ts";
import { getLangUnit } from "../../../../shared/src/util/unitHelper.ts";
import {
  createDefaultPdf,
  PdfSpec,
  PdfTable,
} from "../../../../shared/src/pdf/pdf.ts";
import { Zip } from "../../../../shared/src/pdf/zip.ts";

type ProductRow = [string, string, string];
type GroupedProducts = Map<string, ProductRow[]>;
type DepotGroupedProducts = Map<string, GroupedProducts>;

function joinStrings(...strings: (string | null | undefined)[]): string {
  return strings.filter((s) => !!s).join(" - ");
}

const NUMBER_FORMAT = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

export function formatNumber(v: number): string {
  return NUMBER_FORMAT.format(v);
}

export function formatQuantityChange(
  item: ShipmentItem,
  product: Product,
): string {
  if (item.unit != product.unit || item.conversionFrom != item.conversionTo) {
    const mul = item.multiplicator / 100;
    return `${item.conversionFrom} ${getLangUnit(product.unit)} -> ${formatNumber(item.conversionTo * mul)} ${getLangUnit(item.unit)}`;
  } else {
    if (item.multiplicator != 100) {
      return (
        multiplicatorOptions.find((mo) => mo.value == item.multiplicator)
          ?.title ?? ""
      );
    } else {
      return "";
    }
  }
}

export function createShipmentPackagingPdfSpecs(
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
  footer?: string,
): PdfSpec[] {
  const dataByDepotAndProductCategory: DepotGroupedProducts = new Map();
  for (let item of shipment.shipmentItems) {
    const depot = findDepotNameById(depots, item.depotId);
    const product = productsById[item.productId];
    const productCategory =
      productCategories.find((pc) => pc.id == product.productCategoryId)
        ?.name || "Unbekannte Kategorie";

    const groupedProducts = getOrCompute<GroupedProducts>(
      dataByDepotAndProductCategory,
      depot,
      () => new Map<string, ProductRow[]>(),
    );
    const rows: ProductRow[] = getOrCompute<ProductRow[]>(
      groupedProducts,
      productCategory,
      () => [],
    );
    const description = item.description ? item.description : "";
    rows.push([
      `${product.name}${item.isBio ? " [BIO]" : ""}`,
      `${item.totalShipedQuantity} ${getLangUnit(item.unit)}`,
      joinStrings(formatQuantityChange(item, product), description),
    ]);
  }

  for (let item of shipment.additionalShipmentItems) {
    const productCategory = "Zusätzliches Angebot";
    const depot = findDepotNameById(depots, item.depotId);
    const groupedProducts = getOrCompute<GroupedProducts>(
      dataByDepotAndProductCategory,
      depot,
      () => new Map<string, ProductRow[]>(),
    );
    const rows = getOrCompute<ProductRow[]>(
      groupedProducts,
      productCategory,
      () => [],
    );
    const description = item.description || "";
    rows.push([
      `${item.product}${item.isBio ? " [BIO]" : ""}`,
      `${item.totalShipedQuantity} ${getLangUnit(item.unit)}`,
      `${description}`,
    ]);
  }

  const prettyDate = format(shipment.validFrom, "dd.MM.yyyy");
  return Array.from(
    dataByDepotAndProductCategory.entries(),
    ([depotKey, dataByProductCategory]) => {
      let description = `Lieferschein für ${prettyDate}`;
      if (shipment.description) {
        description += `\n\n${shipment.description}`;
      }

      let footerLeft = "";
      if (footer) {
        footerLeft = `${footer}\n`;
      }

      return {
        receiver: depotKey,
        description,
        footerTextLeft: `${footerLeft}Depot ${depotKey}`,
        footerTextCenter: `Lieferschein ${prettyDate}`,
        tables: Array.from(
          dataByProductCategory.entries(),
          ([name, tableData]) =>
            ({
              name,
              headers: ["Bezeichnung", "Menge", "Bemerkung"],
              widths: ["50%", "15%", "35%"],
              rows: tableData.sort(byKey((row) => row[0], inLocaleOrder)),
            }) as PdfTable,
        ).sort(byKey((table) => table.name, inLocaleOrder)),
      };
    },
  ).sort(byKey((pdf) => pdf.receiver, inLocaleOrder));
}

export async function createShipmentPackagingPdfs(
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
  organizationInfo: OrganizationInfo,
  footer: string,
) {
  const pdfs = createShipmentPackagingPdfSpecs(
    shipment,
    depots,
    productsById,
    productCategories,
    footer,
  );

  const zip = new Zip();
  for (const pdf of pdfs) {
    await zip.addPdf(
      createDefaultPdf(pdf, organizationInfo),
      `${sanitizeFileName(pdf.receiver)}.pdf`,
    );
  }

  zip.download(`shipments-${format(shipment.validFrom, "yyyy-MM-dd")}.zip`);
}
