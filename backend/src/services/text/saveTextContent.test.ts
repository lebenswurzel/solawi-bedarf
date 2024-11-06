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
import { TextContentCategory } from "../../../../shared/src/enum";
import {
  Id,
  SaveTextContentRequest,
  TextContent as TextContentType,
  VersionInfo,
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
import { getVersion } from "../getVersion";
import { deleteTextContent } from "./deleteTextContent";
import { getTextContent } from "./getTextContent";
import { saveTextContent } from "./saveTextContent";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveTextContent(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for different user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId + 100,
    });
    await expect(() => saveTextContent(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("save wrong category", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Geht nicht",
      category: TextContentCategory.TAC,
      content: "Falsch",
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.bad_request);
  await validateAllTextContents({ userData }, [
    "",
    "# Impressum",
    "# Datenschutzerklärung",
  ]);
});

testAsAdmin("save imprint", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Impressum bleibt gleich",
      category: TextContentCategory.IMPRINT,
      content: "Inhaltstext Impressum",
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.no_content);
  expect(await getTexts(TextContentCategory.IMPRINT)).toMatchObject([
    {
      title: "Impressum",
      category: TextContentCategory.IMPRINT,
      content: "Inhaltstext Impressum",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "",
    "Inhaltstext Impressum",
    "# Datenschutzerklärung",
  ]);
});

testAsAdmin("save privacy note", async ({ userData }: TestUserData) => {
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Datenschutzerklärung - bleibt gleich",
      category: TextContentCategory.PRIVACY_NOTICE,
      content: "Inhaltstext PN",
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.no_content);
  expect(await getTexts(TextContentCategory.PRIVACY_NOTICE)).toMatchObject([
    {
      title: "Datenschutzerklärung",
      category: TextContentCategory.PRIVACY_NOTICE,
      content: "Inhaltstext PN",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "",
    "Inhaltstext PN",
    "# Impressum",
  ]);
});

testAsAdmin("save maintenance message", async ({ userData }: TestUserData) => {
  expect(await getMaintenanceInfo({ userData })).toMatchObject({
    enabled: false,
    message: "",
  });
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Wartungshinweis - bleibt gleich",
      category: TextContentCategory.MAINTENANCE_MESSAGE,
      content: "Inhaltstext Wartung",
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.no_content);
  expect(await getTexts(TextContentCategory.MAINTENANCE_MESSAGE)).toMatchObject(
    [
      {
        title: "Wartungshinweis",
        category: TextContentCategory.MAINTENANCE_MESSAGE,
        content: "Inhaltstext Wartung",
      },
    ],
  );
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "Inhaltstext Wartung",
    "# Impressum",
  ]);
  expect(await getMaintenanceInfo({ userData })).toMatchObject({
    enabled: true,
    message: "Inhaltstext Wartung",
  });
});

testAsAdmin("save FAQ", async ({ userData }: TestUserData) => {
  expect(await getTexts(TextContentCategory.FAQ)).toEqual([]);

  // add first
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.created);
  expect(await getTexts(TextContentCategory.FAQ)).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
  ]);

  // add another one
  const ctx2 = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 2",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 2",
    },
    userData.token,
  );
  await saveTextContent(ctx2);
  expect(ctx2.status).toBe(http.created);
  expect(await getTexts(TextContentCategory.FAQ)).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
    {
      title: "Neue FAQ 2",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 2",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
    "Inhalt FAQ 2",
  ]);

  // add another one with same title -> error unique constraint
  const ctx3 = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 2",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 2",
    },
    userData.token,
  );
  await expect(() => saveTextContent(ctx3)).rejects.toThrowError(
    "unique constraint",
  );
  const allFaqTexts = await getTexts(TextContentCategory.FAQ);
  expect(allFaqTexts).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
    {
      title: "Neue FAQ 2",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 2",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
    "Inhalt FAQ 2",
  ]);

  // rename and reword FAQ2
  const ctx22 = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 2.2",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 2.2",
      id: allFaqTexts.filter((v) => v.title == "Neue FAQ 2")[0].id,
    },
    userData.token,
  );
  await saveTextContent(ctx22);
  expect(ctx22.status).toBe(http.no_content);
  expect(await getTexts(TextContentCategory.FAQ)).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
    {
      title: "Neue FAQ 2.2",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 2.2",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
    "Inhalt FAQ 2.2",
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
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 2.2",
  ]);
});

testAsAdmin("save bad FAQ", async ({ userData }: TestUserData) => {
  expect(await getTexts(TextContentCategory.FAQ)).toEqual([]);

  // add first
  const ctx = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
    userData.token,
  );
  await saveTextContent(ctx);
  expect(ctx.status).toBe(http.created);
  expect(await getTexts(TextContentCategory.FAQ)).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
  ]);

  // try to save but with wrong id
  const ctxWrongId = createBasicTestCtx<SaveTextContentRequest>(
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Wrong",
      id: -1,
    },
    userData.token,
  );
  await expect(() => saveTextContent(ctxWrongId)).rejects.toThrowError(
    "Error 400",
  );
  expect(await getTexts(TextContentCategory.FAQ)).toMatchObject([
    {
      title: "Neue FAQ 1",
      category: TextContentCategory.FAQ,
      content: "Inhalt FAQ 1",
    },
  ]);
  await validateAllTextContents({ userData }, [
    "# Datenschutzerklärung",
    "",
    "# Impressum",
    "Inhalt FAQ 1",
  ]);
});

const validateAllTextContents = async (
  { userData }: TestUserData,
  expectedTexts: string[],
) => {
  const ctx = createBasicTestCtx(undefined, userData.token);
  await getTextContent(ctx);
  expect(
    new Set(ctx.body.textContent.map((v: TextContent) => v.content)),
  ).toEqual(new Set(expectedTexts));
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
  }));
};

const getMaintenanceInfo = async ({
  userData,
}: TestUserData): Promise<{ enabled?: boolean; message?: string }> => {
  const ctx = createBasicTestCtx<VersionInfo>(undefined, userData.token);
  await getVersion(ctx);
  return ctx.body.buildInfo.maintenance;
};
