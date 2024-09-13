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
  ProductCategoryWithProducts,
  ProductsById,
  Shipment,
} from "../../../../shared/src/types";
import { getLangUnit } from "../../lang/template";
import { multiplicatorOptions } from "../options";
import { format } from "date-fns";
import { createDefaultPdf, PdfTable } from "../pdf/pdf";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import { Zip } from "../pdf/zip";
import { findDepotNameById, getOrCompute } from "../utils.ts";

type ProductRow = [string, string, string];
type GroupedProducts = Map<string, ProductRow[]>;
type DepotGroupedProducts = Map<string, GroupedProducts>;

export async function createShipmentPackagingPdfs(
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
) {
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
    const multiplicator =
      item.multiplicator != 100
        ? multiplicatorOptions.find((mo) => mo.value == item.multiplicator)
            ?.title
        : "";
    const conversion =
      item.unit != product.unit || item.conversionFrom != item.conversionTo
        ? `(${item.conversionFrom} ${getLangUnit(product.unit)} -> ${item.conversionTo} ${getLangUnit(item.unit)})`
        : "";
    const description = item.description ? item.description : "";
    rows.push([
      `${product.name}${item.isBio ? " [BIO]" : ""}`,
      `${item.totalShipedQuantity} ${getLangUnit(item.unit)}`,
      `${multiplicator} ${conversion} ${description}`,
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
  const zip = new Zip();
  for (const [
    depotKey,
    dataByProductCategory,
  ] of dataByDepotAndProductCategory.entries()) {
    let description = `Lieferschein für ${prettyDate}`;
    if (shipment.description) {
      description += `\n\n${shipment.description}`;
    }

    const pdf = createDefaultPdf({
      receiver: depotKey,
      description,
      footerTextLeft: `Depot ${depotKey}`,
      footerTextCenter: `Lieferschein ${prettyDate}`,
      tables: [...dataByProductCategory.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(
          ([name, tableData]) =>
            ({
              name,
              headers: ["Bezeichnung", "Menge", "Bemerkung"],
              widths: ["50%", "15%", "35%"],
              rows: tableData.sort((a, b) => a[0].localeCompare(b[0])),
            }) as PdfTable,
        ),
    });
    await zip.addPdf(pdf, `${sanitizeFileName(depotKey)}.pdf`);
  }

  zip.download(`shipments-${format(shipment.validFrom, "yyyy-MM-dd")}.zip`);
}
