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
import Koa from "koa";
import Router from "koa-router";
import { TextContentTyp } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { TextContent as TextContentDto } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { TextContent } from "../../database/TextContent";

const toListItem = (row: TextContent): TextContentDto => {
  if (row.typ === TextContentTyp.BASE64_IMAGE) {
    return {
      id: row.id,
      title: row.title,
      content: "",
      category: row.category,
      typ: row.typ,
      hasContent: row.content.length > 0,
    };
  }
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    typ: row.typ,
  };
};

const toFullItem = (row: TextContent): TextContentDto => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  typ: row.typ,
  hasContent:
    row.typ === TextContentTyp.BASE64_IMAGE
      ? row.content.length > 0
      : undefined,
});

export const getTextContent = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const idParam = ctx.request.query.id;
  const repository = AppDataSource.getRepository(TextContent);

  if (idParam !== undefined) {
    const id = parseInt(String(idParam), 10);
    if (Number.isNaN(id)) {
      ctx.throw(http.bad_request, "invalid id");
    }
    const row = await repository.findOneBy({ id });
    if (!row) {
      ctx.throw(http.not_found);
    }
    ctx.body = { textContent: [toFullItem(row)] };
    return;
  }

  const textContent = await repository.find();
  ctx.body = { textContent: textContent.map(toListItem) };
};
