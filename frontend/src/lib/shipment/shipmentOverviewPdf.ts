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
import { generateOverviewPdf } from "../pdf/pdf";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import { format } from "date-fns/format";

type DepotKey = string;
type ProductCategoryKey = string;
type ProductKey = string;
type ProductAmount = number;

type DataByProductCategoryAndProduct = {
  [key: ProductCategoryKey]: {
    [key: DepotKey]: { [key: ProductKey]: ProductAmount };
  };
};

export const createShipmentOverviewPdfSpec = (
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
) => {
  const dataByDepotAndProductCategory: {
    [key: DepotKey]: {
      [key: ProductCategoryKey]: {
        Bezeichnung: ProductKey;
        Menge: ProductAmount;
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
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${product.name}${item.isBio ? " [BIO]" : ""} [${getLangUnit(item.unit)}]`,
      Menge: item.totalShipedQuantity,
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
    dataByDepotAndProductCategory[depot][productCategory].push({
      Bezeichnung: `${item.product}${item.isBio ? " [BIO]" : ""} [${getLangUnit(item.unit)}]`,
      Menge: item.totalShipedQuantity,
    });
  }
  const dataByProductCategoryAndProduct: DataByProductCategoryAndProduct = {};
  const depotKeys = Object.keys(dataByDepotAndProductCategory);
  for (let depotKey of depotKeys) {
    const productCategoryKeys = Object.keys(
      dataByDepotAndProductCategory[depotKey],
    );
    for (let productCategoryKey of productCategoryKeys) {
      const data = dataByDepotAndProductCategory[depotKey][productCategoryKey];
      if (!dataByProductCategoryAndProduct[productCategoryKey]) {
        dataByProductCategoryAndProduct[productCategoryKey] = {};
      }
      for (let item of data) {
        if (
          !dataByProductCategoryAndProduct[productCategoryKey][item.Bezeichnung]
        ) {
          dataByProductCategoryAndProduct[productCategoryKey][
            item.Bezeichnung
          ] = { Summe: 0 };
        }
        dataByProductCategoryAndProduct[productCategoryKey][item.Bezeichnung][
          depotKey
        ] = item.Menge;
        dataByProductCategoryAndProduct[productCategoryKey][
          item.Bezeichnung
        ].Summe += item.Menge;
      }
    }
  }

  return dataByProductCategoryAndProduct;
};

export const createShipmentOverviewPdf = async (
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
) => {
  const dataByProductCategoryAndProduct = createShipmentOverviewPdfSpec(
    shipment,
    depots,
    productsById,
    productCategories,
  );
  const zip = new JSZip();
  const productCategoryKeys = Object.keys(dataByProductCategoryAndProduct);
  for (let productCategoryKey of productCategoryKeys) {
    const dataByProduct = dataByProductCategoryAndProduct[productCategoryKey];
    let description = `Übersicht für ${productCategoryKey} vom ${format(shipment.validFrom, "dd.MM.yyyy")}`;
    const pdf = generateOverviewPdf(dataByProduct, description);
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    zip.file(`${sanitizeFileName(productCategoryKey)}.pdf`, blob, {
      binary: true,
    });
  }
  zip.generateAsync({ type: "blob" }).then((content) => {
    const blob = new Blob([content], { type: "zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overview-${format(shipment.validFrom, "yyyy-MM-dd")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  });
};
