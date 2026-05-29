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
import { randomUUID } from "node:crypto";
import {
  ProductCategoryType,
  Unit,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import type {
  Depot,
  ProductCategory,
  ProductCategoryWithProducts,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { beforeAll, describe, expect, test } from "vitest";
import { apiFetch, loginAsAdmin } from "./apiClient";

const CONFIG_ID = 1;

const suffix = randomUUID().slice(0, 8);
const depotName = `smoke-depot-${suffix}`;
const categoryName = `smoke-category-${suffix}`;
const productName = `smoke-product-${suffix}`;

let categoryId: number;

describe.sequential("mutation smoke test", () => {
  beforeAll(async () => {
    await loginAsAdmin();
  });

  test("depot create + list", async () => {
    const before = await apiFetch<{ depots: Depot[] }>("GET", "/depot");
    const countBefore = before.depots?.length ?? 0;

    await apiFetch("POST", "/depot", {
      body: {
        name: depotName,
        address: "Smoke Test St",
        openingHours: "9-5",
        capacity: 12,
        active: true,
      },
    });

    const after = await apiFetch<{ depots: Depot[] }>("GET", "/depot");
    const countAfter = after.depots?.length ?? 0;

    expect(countAfter).toBeGreaterThan(countBefore);
    expect(after.depots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: depotName, active: true }),
      ]),
    );
  });

  test("product category create + list", async () => {
    const created = await apiFetch<ProductCategory>("POST", "/productCategory", {
      body: {
        name: categoryName,
        active: true,
        requisitionConfigId: CONFIG_ID,
        typ: ProductCategoryType.SELFGROWN,
      },
    });

    expect(created.id).toBeDefined();
    categoryId = created.id;

    const listed = await apiFetch<{
      productCategories: ProductCategory[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    expect(listed.productCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: categoryName, active: true }),
      ]),
    );
  });

  test("product create + list", async () => {
    await apiFetch("POST", "/productCategory/product", {
      body: {
        name: productName,
        active: true,
        msrp: 1,
        frequency: 30,
        quantity: 20,
        quantityMin: 10,
        quantityMax: 30,
        quantityStep: 5,
        unit: Unit.WEIGHT,
        vatRate: 7,
        productCategoryId: categoryId,
      },
    });

    const listed = await apiFetch<{
      productCategories: ProductCategoryWithProducts[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    const category = listed.productCategories?.find((c) => c.id === categoryId);
    expect(category).toBeDefined();
    expect(category!.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: productName, active: true }),
      ]),
    );
  });
});
