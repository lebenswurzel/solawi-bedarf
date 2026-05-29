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
  TextContentCategory,
  TextContentTyp,
  Unit,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import type {
  Depot,
  Product,
  ProductCategory,
  ProductCategoryWithProducts,
  TextContent,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { beforeAll, describe, expect, test } from "vitest";
import { apiFetch, loginAsAdmin, publicApiFetch } from "./apiClient";

const CONFIG_ID = 1;

const suffix = randomUUID().slice(0, 8);
const depotName = `smoke-depot-${suffix}`;
const depotNameUpdated = `${depotName}-updated`;
const categoryName = `smoke-category-${suffix}`;
const categoryNameUpdated = `${categoryName}-updated`;
const productName = `smoke-product-${suffix}`;
const productNameUpdated = `${productName}-updated`;
const faqTitle = `smoke-faq-${suffix}`;
const faqTitleUpdated = `${faqTitle}-updated`;
const applicantEmail = `smoke-applicant-${suffix}@example.test`;

let depotId: number;
let categoryId: number;
let productId: number;
let faqId: number;
let applicantId: number;

function findCategory(
  categories: ProductCategoryWithProducts[] | undefined,
  id: number,
): ProductCategoryWithProducts | undefined {
  return categories?.find((c) => c.id === id);
}

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
    const depot = after.depots?.find((d) => d.name === depotName);
    expect(depot).toMatchObject({ name: depotName, active: true });
    depotId = depot!.id;
  });

  test("depot update + list", async () => {
    await apiFetch("POST", "/depot", {
      body: {
        id: depotId,
        name: depotNameUpdated,
        address: "Smoke Test St 2",
        openingHours: "10-6",
        capacity: 14,
        active: true,
        comment: "smoke test",
      },
    });

    const listed = await apiFetch<{ depots: Depot[] }>("GET", "/depot");
    expect(listed.depots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: depotId,
          name: depotNameUpdated,
          address: "Smoke Test St 2",
          active: true,
        }),
      ]),
    );
    expect(listed.depots?.find((d) => d.name === depotName)).toBeUndefined();
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

  test("product category update + list", async () => {
    await apiFetch<ProductCategory>("POST", "/productCategory", {
      body: {
        id: categoryId,
        name: categoryNameUpdated,
        active: true,
        requisitionConfigId: CONFIG_ID,
        typ: ProductCategoryType.SELFGROWN,
      },
    });

    const listed = await apiFetch<{
      productCategories: ProductCategory[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    expect(listed.productCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: categoryId,
          name: categoryNameUpdated,
          active: true,
        }),
      ]),
    );
  });

  test("product create + list", async () => {
    const created = await apiFetch<Product>("POST", "/productCategory/product", {
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

    expect(created.id).toBeDefined();
    productId = created.id;

    const listed = await apiFetch<{
      productCategories: ProductCategoryWithProducts[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    const category = findCategory(listed.productCategories, categoryId);
    expect(category?.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: productId, name: productName, active: true }),
      ]),
    );
  });

  test("product update + list", async () => {
    await apiFetch<Product>("POST", "/productCategory/product", {
      body: {
        id: productId,
        name: productNameUpdated,
        active: true,
        msrp: 2,
        frequency: 30,
        quantity: 20,
        quantityMin: 10,
        quantityMax: 30,
        quantityStep: 5,
        unit: Unit.WEIGHT,
        vatRate: 19,
        productCategoryId: categoryId,
      },
    });

    const listed = await apiFetch<{
      productCategories: ProductCategoryWithProducts[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    const category = findCategory(listed.productCategories, categoryId);
    expect(category?.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: productId,
          name: productNameUpdated,
          msrp: 2,
          vatRate: 19,
          active: true,
        }),
      ]),
    );
  });

  test("faq text content create + update + list", async () => {
    await apiFetch("POST", "/content/text", {
      body: {
        title: faqTitle,
        category: TextContentCategory.FAQ,
        content: "Smoke FAQ content",
        typ: TextContentTyp.MD,
      },
    });

    let listed = await apiFetch<{ textContent: TextContent[] }>(
      "GET",
      "/content/text",
    );
    const created = listed.textContent?.find((t) => t.title === faqTitle);
    expect(created).toMatchObject({
      title: faqTitle,
      category: TextContentCategory.FAQ,
      content: "Smoke FAQ content",
    });
    faqId = created!.id;

    await apiFetch("POST", "/content/text", {
      body: {
        id: faqId,
        title: faqTitleUpdated,
        category: TextContentCategory.FAQ,
        content: "Smoke FAQ content updated",
        typ: TextContentTyp.MD,
      },
    });

    listed = await apiFetch<{ textContent: TextContent[] }>(
      "GET",
      "/content/text",
    );
    expect(listed.textContent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: faqId,
          title: faqTitleUpdated,
          content: "Smoke FAQ content updated",
        }),
      ]),
    );
    expect(listed.textContent?.find((t) => t.title === faqTitle)).toBeUndefined();
  });

  test("faq text content delete", async () => {
    await apiFetch("DELETE", `/content/text?id=${faqId}`);

    const listed = await apiFetch<{ textContent: TextContent[] }>(
      "GET",
      "/content/text",
    );
    expect(listed.textContent?.find((t) => t.id === faqId)).toBeUndefined();
  });

  test("applicant create + deactivate + delete", async () => {
    await publicApiFetch("POST", "/applicant", {
      body: {
        confirmGDPR: true,
        comment: "Smoke test applicant",
        password: "smoke-test-pw",
        address: {
          firstname: "Smoke",
          lastname: "Applicant",
          email: applicantEmail,
          phone: "0123456789",
          street: "Testweg 1",
          postalcode: "12345",
          city: "Teststadt",
        },
      },
    });

    const listedNew = await apiFetch<{
      applicants: { id: number; address: { email: string } }[];
    }>("GET", "/applicant?state=NEW");

    const applicant = listedNew.applicants?.find(
      (a) => a.address.email === applicantEmail,
    );
    expect(applicant).toBeDefined();
    applicantId = applicant!.id;

    await apiFetch("POST", `/applicant/${applicantId}/deactivate`);

    const afterDeactivate = await apiFetch<{
      applicants: { id: number; address: { email: string } }[];
    }>("GET", "/applicant?state=NEW");

    expect(
      afterDeactivate.applicants?.find((a) => a.id === applicantId),
    ).toBeUndefined();

    const listedDeleted = await apiFetch<{
      applicants: { id: number; address: { email: string } }[];
    }>("GET", "/applicant?state=DELETED");

    expect(
      listedDeleted.applicants?.find((a) => a.id === applicantId),
    ).toBeDefined();

    await apiFetch("DELETE", `/applicant?id=${applicantId}`);

    const afterDelete = await apiFetch<{
      applicants: { id: number; address: { email: string } }[];
    }>("GET", "/applicant?state=DELETED");

    expect(
      afterDelete.applicants?.find((a) => a.id === applicantId),
    ).toBeUndefined();
  });

  test("cleanup product and product category", async () => {
    await apiFetch("DELETE", "/productCategory/product", {
      body: { id: productId },
    });

    let listed = await apiFetch<{
      productCategories: ProductCategoryWithProducts[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    const category = findCategory(listed.productCategories, categoryId);
    expect(category?.products?.find((p) => p.id === productId)).toBeUndefined();

    await apiFetch("DELETE", "/productCategory", {
      body: { id: categoryId },
    });

    listed = await apiFetch<{
      productCategories: ProductCategoryWithProducts[];
    }>("GET", `/productCategory?configId=${CONFIG_ID}`);

    expect(findCategory(listed.productCategories, categoryId)).toBeUndefined();
  });
});
