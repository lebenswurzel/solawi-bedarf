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
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { multiplicatorOptions } from "../options";
import { format } from "date-fns";
import { sanitizeFileName } from "@lebenswurzel/solawi-bedarf-shared/src/util/fileHelper.ts";
import {
  byKey,
  findDepotNameById,
  getOrCompute,
  inLocaleOrder,
} from "@lebenswurzel/solawi-bedarf-shared/src/util/utils.ts";
import { getLangUnit } from "@lebenswurzel/solawi-bedarf-shared/src/util/unitHelper.ts";
import {
  createDefaultPdf,
  PdfSpec,
  PdfTable,
} from "@lebenswurzel/solawi-bedarf-shared/src/pdf/pdf.ts";
import { Zip } from "@lebenswurzel/solawi-bedarf-shared/src/pdf/zip.ts";
import { TCreatedPdf } from "pdfmake/build/pdfmake";

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
    return `Änderung: ${item.conversionFrom} ${getLangUnit(product.unit)} entspricht ${formatNumber(item.conversionTo * mul)} ${getLangUnit(item.unit)}`;
  } else {
    if (item.multiplicator != 100) {
      return (
        multiplicatorOptions.find((mo) => mo.value == item.multiplicator)
          ?.display ?? ""
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
  headerText?: string,
  footerText?: string,
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
      `${item.totalShipedQuantity} ${getLangUnit(item.unit)}`,
      `${product.name}${item.isBio ? " [BIO]" : ""}`,
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
      `${item.totalShipedQuantity} ${getLangUnit(item.unit)}`,
      `${item.product}${item.isBio ? " [BIO]" : ""}`,
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
      if (footerText) {
        footerLeft = `${footerText}\n`;
      }

      return {
        receiver: depotKey,
        description,
        headerTextLeft: headerText,
        footerTextLeft: `${footerLeft}Depot ${depotKey}`,
        footerTextRight: `Lieferschein ${prettyDate}`,
        tables: Array.from(
          dataByProductCategory.entries(),
          ([name, tableData]) =>
            ({
              name,
              headers: [
                "Gesamtmenge der Lieferung",
                "Bezeichnung",
                "Bemerkung",
              ],
              widths: ["15%", "50%", "35%"],
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
  headerText: string,
  footerText: string,
) {
  const pdfSpecs = createShipmentPackagingPdfSpecs(
    shipment,
    depots,
    productsById,
    productCategories,
    headerText,
    footerText,
  );

  const prettyDate = format(shipment.validFrom, "yyyy-MM-dd");
  const zip = new Zip();

  // Create individual PDFs for each depot
  const pdfs: TCreatedPdf[] = [];
  for (const pdfSpec of pdfSpecs) {
    const pdf = createDefaultPdf(pdfSpec, organizationInfo);
    pdfs.push(pdf);
    await zip.addPdf(pdf, `${sanitizeFileName(pdfSpec.receiver)}.pdf`);
  }

  // Create and add merged PDF
  await zip.mergePdfs(pdfs, "Alle Depots.pdf");

  // Download the zip file
  zip.download(`shipments-${prettyDate}.zip`);
}
