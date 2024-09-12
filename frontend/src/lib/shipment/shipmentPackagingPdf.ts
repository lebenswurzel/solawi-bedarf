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
import JSZip from "jszip";
import {
  Depot,
  ProductCategoryWithProducts,
  ProductsById,
  Shipment,
} from "../../../../shared/src/types";
import { getLangUnit } from "../../lang/template";
import { multiplicatorOptions } from "../options";
import { format } from "date-fns";
import { generatePdf } from "../pdf/pdf";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import { TCreatedPdf } from "pdfmake/build/pdfmake";

function getOrCompute<V>(obj: Record<string, V>, key: string, fn: (k: string) => V): V {
  const value = obj[key];
  if (value === undefined) {
    const init = fn(key);
    obj[key] = init;
    return init;
  } else {
    return value;
  }
}

class Zip {
  private jszip: JSZip;

  constructor() {
    this.jszip = new JSZip();
  }

  public async addPdf(pdf: TCreatedPdf, filename: string) {
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    this.jszip.file(filename, blob, { binary: true });
  }

  public download(filename: string) {
    this.jszip.generateAsync({ type: "blob" }).then((content) => {
      const blob = new Blob([content], { type: "zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }
}

function findDepotById(depots: Depot[], depotId: number): Depot {
  return depots.find((d) => d.id == depotId);
}

function findDepotNameById(depots: Depot[], depotId: number): string {
  return findDepotById(depots, depotId)?.name || "Unbekanntes Depot";
}

interface Product {
  Bezeichnung: string;
  Einheit: string;
  Menge: number;
  Bemerkung: string;
}

type GroupedProducts = Record<string, Product[]>;
type DepotGroupedProducts = Record<string, GroupedProducts>;

export async function createShipmentPackagingPdfs(
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[]
) {
  const dataByDepotAndProductCategory: DepotGroupedProducts = {};
  for (let item of shipment.shipmentItems) {
    const depot = findDepotNameById(depots, item.depotId);
    const product = productsById[item.productId];
    const productCategory =
      productCategories.find((pc) => pc.id == product.productCategoryId)
        ?.name || "Unbekannte Kategorie";

    const groupedProducts = getOrCompute(dataByDepotAndProductCategory, depot, () => {
      return {};
    });
    const products = getOrCompute(groupedProducts, productCategory, () => []);
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
    products.push({
      Bezeichnung: `${product.name}${item.isBio ? " [BIO]" : ""}`,
      Einheit: getLangUnit(item.unit),
      Menge: item.totalShipedQuantity,
      Bemerkung: `${multiplicator} ${conversion} ${description}`,
    });
  }
  for (let item of shipment.additionalShipmentItems) {
    const productCategory = "Zusätzliches Angebot";
    const depot = findDepotNameById(depots, item.depotId);
    const groupedProducts = getOrCompute(dataByDepotAndProductCategory, depot, () => {
      return {};
    });
    const products = getOrCompute(groupedProducts, productCategory, () => []);
    const description = item.description ? item.description : "";
    products.push({
      Bezeichnung: `${item.product}${item.isBio ? " [BIO]" : ""}`,
      Einheit: getLangUnit(item.unit),
      Menge: item.totalShipedQuantity,
      Bemerkung: `${description}`,
    });
  }

  const prettyDate = format(shipment.validFrom, "dd.MM.yyyy");
  const zip = new Zip();
  for (const [depotKey, dataByProductCategory] of Object.entries(dataByDepotAndProductCategory)) {
    let description = `Lieferschein für ${prettyDate}`;
    if (shipment.description) {
      description += `\n\n${shipment.description}`;
    }
    const pdf = generatePdf(
      dataByProductCategory,
      depotKey,
      description,
      `Depot ${depotKey}`,
      `Lieferschein ${prettyDate}`,
    );
    zip.addPdf(pdf, `${sanitizeFileName(depotKey)}.pdf`);
  }

  zip.download(`shipments-${format(shipment.validFrom, "yyyy-MM-dd")}.zip`);
}
