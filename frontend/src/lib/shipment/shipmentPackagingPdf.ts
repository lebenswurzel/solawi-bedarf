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

export const createShipmentPackagingPdfs = async (
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
) => {
  const dataByDepotAndProductCategory: {
    [key: string]: {
      [key: string]: {
        Bezeichnung: string;
        Einheit: string;
        Menge: number;
        Bemerkung: string;
      }[];
    };
  } = {};
  for (let item of shipment.shipmentItems) {
    const depot =
      depots.find((d) => d.id == item.depotId)?.name || "Unbekanntes Depot";
    const product = productsById[item.productId];
    const productCategory =
      productCategories.find((pc) => pc.id == product.productCategoryId)
        ?.name || "Unbekannte Kategorie";
    if (!dataByDepotAndProductCategory[depot]) {
      dataByDepotAndProductCategory[depot] = {};
    }
    if (!dataByDepotAndProductCategory[depot][productCategory]) {
      dataByDepotAndProductCategory[depot][productCategory] = [];
    }
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
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${product.name}${item.isBio ? " [BIO]" : ""}`,
      Einheit: getLangUnit(item.unit),
      Menge: item.totalShipedQuantity,
      Bemerkung: `${multiplicator} ${conversion} ${description}`,
    });
  }
  for (let item of shipment.additionalShipmentItems) {
    const productCategory = "Zusätzliches Angebot";
    const depot =
      depots.find((d) => d.id == item.depotId)?.name || "Unbekanntes Depot";
    if (!dataByDepotAndProductCategory[depot]) {
      dataByDepotAndProductCategory[depot] = {};
    }
    if (!dataByDepotAndProductCategory[depot][productCategory]) {
      dataByDepotAndProductCategory[depot][productCategory] = [];
    }
    const description = item.description ? item.description : "";
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${item.product}${item.isBio ? " [BIO]" : ""}`,
      Einheit: getLangUnit(item.unit),
      Menge: item.totalShipedQuantity,
      Bemerkung: `${description}`,
    });
  }
  const zip = new JSZip();
  const depotKeys = Object.keys(dataByDepotAndProductCategory);
  const prettyDate = format(shipment.validFrom, "dd.MM.yyyy");
  for (let depotKey of depotKeys) {
    const dataByProductCategory = dataByDepotAndProductCategory[depotKey];
    let description = `Lieferschein für ${prettyDate}`;
    if (shipment.description) {
      description += `\n\n${shipment.description}`;
    }
    const pdf = generatePdf(
      dataByProductCategory,
      depotKey,
      description,
      depotKey,
      `Lieferschein ${prettyDate}`,
    );
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    zip.file(`${sanitizeFileName(depotKey)}.pdf`, blob, { binary: true });
  }
  zip.generateAsync({ type: "blob" }).then((content) => {
    const blob = new Blob([content], { type: "zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipments-${format(shipment.validFrom, "yyyy-MM-dd")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  });
};
