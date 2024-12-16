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
  BaseShipmentItem,
  Depot,
  ProductCategoryWithProducts,
  ProductsById,
  Shipment,
} from "../../../../shared/src/types";
import { sanitizeFileName } from "../../../../shared/src/util/fileHelper";
import { format } from "date-fns/format";
import { getLangUnit } from "../../../../shared/src/util/unitHelper";
import {
  generateOverviewPdf,
  HeaderSortKeys,
} from "../../../../shared/src/pdf/pdf";

type DepotKey = string;
type ProductCategoryKey = string;
type ProductKey = string;
type ProductAmount = number;

type DataByProductCategoryAndProduct = {
  [key: ProductCategoryKey]: {
    [key: DepotKey]: { [key: ProductKey]: ProductAmount };
  };
};

type ProductDescription = {
  Bezeichnung: ProductKey;
  Menge: ProductAmount;
};

type DataByDepotAndProductCategory = {
  [key: DepotKey]: {
    [key: ProductCategoryKey]: ProductDescription[];
  };
};

const ensureObjectKeys = (
  obj: DataByDepotAndProductCategory,
  depotKey: DepotKey,
  productCategory: ProductCategoryKey,
): void => {
  if (!obj[depotKey]) {
    obj[depotKey] = {};
  }
  if (!obj[depotKey][productCategory]) {
    obj[depotKey][productCategory] = [];
  }
};

const createProductDescription = (
  item: BaseShipmentItem,
  productName: string,
): ProductDescription => {
  return {
    Bezeichnung: `${productName}${item.isBio ? " [BIO]" : ""} [${getLangUnit(item.unit)}]`,
    Menge: item.totalShipedQuantity,
  };
};

export const createShipmentOverviewPdfSpec = (
  shipment: Shipment,
  depots: Depot[],
  productsById: ProductsById,
  productCategories: ProductCategoryWithProducts[],
): DataByProductCategoryAndProduct => {
  const findDepotName = (depotId: number): DepotKey => {
    return depots.find((d) => d.id == depotId)?.name || "Unbekanntes Depot";
  };

  const findProductCategory = (
    productCategoryId: number,
  ): ProductCategoryKey => {
    return (
      productCategories.find((pc) => pc.id == productCategoryId)?.name ||
      "Unbekannte Kategorie"
    );
  };

  const dataByDepotAndProductCategory: DataByDepotAndProductCategory = {};

  // collect products
  for (let item of shipment.shipmentItems) {
    const depotKey: DepotKey = findDepotName(item.depotId);
    const product = productsById[item.productId];
    const productCategory = findProductCategory(product.productCategoryId);
    ensureObjectKeys(dataByDepotAndProductCategory, depotKey, productCategory);
    dataByDepotAndProductCategory[depotKey][productCategory].push(
      createProductDescription(item, product.name),
    );
  }

  // collect additional products
  for (let item of shipment.additionalShipmentItems) {
    const depotKey: DepotKey = findDepotName(item.depotId);
    const productCategory = "Zusätzliches Angebot";
    ensureObjectKeys(dataByDepotAndProductCategory, depotKey, productCategory);
    dataByDepotAndProductCategory[depotKey][productCategory].push(
      createProductDescription(item, item.product),
    );
  }

  // group products by:
  // 1. product category names
  // 2. depot names
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

const getOverviewSortKeys = (depots: Depot[]): HeaderSortKeys => {
  const headerDepotSortKeys = depots
    .filter((depot) => !!depot.name)
    .reduce((acc, depot) => {
      acc[depot.name] = depot.rank;
      return acc;
    }, {} as HeaderSortKeys);
  return {
    Bezeichnung: -2,
    Summe: -1,
    ...headerDepotSortKeys,
  };
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
    const pdf = generateOverviewPdf(
      dataByProduct,
      description,
      getOverviewSortKeys(depots),
    );
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
