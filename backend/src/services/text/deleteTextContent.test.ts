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
import { expect, test } from "vitest";
import {
  TextContentCategory,
  TextContentTyp,
} from "../../../../shared/src/enum";
import {
  Id,
  SaveTextContentRequest,
  TextContent as TextContentType,
} from "../../../../shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
} from "../../../testSetup";
import { http } from "../../consts/http";
import { TextContent } from "../../database/TextContent";
import { AppDataSource } from "../../database/database";
import { deleteTextContent } from "./deleteTextContent";
import { getTextContent } from "./getTextContent";
import { saveTextContent } from "./saveTextContent";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => deleteTextContent(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for different user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId + 100,
    });
    await expect(() => deleteTextContent(ctx)).rejects.toThrowError(
      "Error 403",
    );
  },
);

testAsAdmin("no id", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<Id>(undefined, userData.token);
  await expect(() => deleteTextContent(ctx)).rejects.toThrowError("Error 403");
});

testAsAdmin("bad id", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<Id>(undefined, userData.token, undefined, {
    id: -1,
  });
  await deleteTextContent(ctx);
  expect(ctx.status).toBe(http.bad_request);
});

testAsAdmin("bad id 2", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<Id>(undefined, userData.token, undefined, {
    id: "0.0",
  });
  await deleteTextContent(ctx);
  expect(ctx.status).toBe(http.bad_request);
});

testAsAdmin("bad id 3", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<Id>(undefined, userData.token, undefined, {
    id: "thisistext",
  });
  await deleteTextContent(ctx);
  expect(ctx.status).toBe(http.bad_request);
});

testAsAdmin("cannot delete imprint", async ({ userData }: TestUserData) => {
  const allTexts = await getTexts(TextContentCategory.IMPRINT);
  expect(allTexts).toMatchObject([{ content: "# Impressum" }]);

  const ctx = createBasicTestCtx<Id>(undefined, userData.token, undefined, {
    id: allTexts.filter((v) => v.category == TextContentCategory.IMPRINT)[0].id,
  });
  await deleteTextContent(ctx);
  expect(ctx.status).toBe(http.bad_request);
  await validateTextContentsWithoutOrgInfo({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
  ]);

  expect(await getTexts(TextContentCategory.IMPRINT)).toMatchObject([
    { content: "# Impressum" },
  ]);
});

testAsAdmin(
  "cannot delete privacy note",
  async ({ userData }: TestUserData) => {
    const allTexts = await getTexts(TextContentCategory.PRIVACY_NOTICE);
    expect(allTexts).toMatchObject([{ content: "# Datenschutzerklärung" }]);

    const ctx = createBasicTestCtx<Id>(undefined, userData.token, undefined, {
      id: allTexts.filter(
        (v) => v.category == TextContentCategory.PRIVACY_NOTICE,
      )[0].id,
    });
    await deleteTextContent(ctx);
    expect(ctx.status).toBe(http.bad_request);
    await validateTextContentsWithoutOrgInfo({ userData }, [
      "# Datenschutzerklärung",
      "",
      "# Impressum",
    ]);

    expect(await getTexts(TextContentCategory.PRIVACY_NOTICE)).toMatchObject([
      { content: "# Datenschutzerklärung" },
    ]);
  },
);

testAsAdmin(
  "cannot delete maintenance message",
  async ({ userData }: TestUserData) => {
    const allTexts = await getTexts(TextContentCategory.MAINTENANCE_MESSAGE);
    expect(allTexts).toMatchObject([{ content: "" }]);

    const ctx = createBasicTestCtx<Id>(undefined, userData.token, undefined, {
      id: allTexts.filter(
        (v) => v.category == TextContentCategory.MAINTENANCE_MESSAGE,
      )[0].id,
    });
    await deleteTextContent(ctx);
    expect(ctx.status).toBe(http.bad_request);
    await validateTextContentsWithoutOrgInfo({ userData }, [
      "# Datenschutzerklärung",
      "",
      "# Impressum",
    ]);

    expect(
      await getTexts(TextContentCategory.MAINTENANCE_MESSAGE),
    ).toMatchObject([{ content: "" }]);
  },
);

testAsAdmin("delete FAQ", async ({ userData }: TestUserData) => {
  expect(await getTexts(TextContentCategory.FAQ)).toEqual([]);

  // add first
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
      typ: TextContentTyp.MD,
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.created);
  const allFaqTexts = await getTexts(TextContentCategory.FAQ);
  expect(allFaqTexts).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
  ]);
  await validateTextContentsWithoutOrgInfo({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
  ]);

  // delete FAQ 1
  const ctxDelete1 = createBasicTestCtx<Id>(
    undefined,
    userData.token,
    undefined,
    {
      id: allFaqTexts.filter((v) => v.title == "Neue FAQ 1")[0].id,
    },
  );
  await deleteTextContent(ctxDelete1);
  expect(ctxDelete1.status).toBe(http.no_content);
  await validateTextContentsWithoutOrgInfo({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
  ]);
});

const validateTextContentsWithoutOrgInfo = async (
  { userData }: TestUserData,
  expectedTexts: string[],
) => {
  const ctx = createBasicTestCtx(undefined, userData.token);
  await getTextContent(ctx);
  const filteredTexts = ctx.body.textContent.filter(
    (t: TextContent) => t.category != TextContentCategory.ORGANIZATION_INFO,
  );
  expect(new Set(filteredTexts.map((v: TextContent) => v.content))).toEqual(
    new Set(expectedTexts),
  );
};

const getTexts = async (
  category: TextContentCategory,
): Promise<TextContentType[]> => {
  return (
    (await AppDataSource.getRepository(TextContent).findBy({ category })) || []
  ).map((v) => ({
    title: v.title,
    category: v.category,
    content: v.content,
    id: v.id,
    typ: v.typ,
  }));
};
