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
import {
  TextContentCategory,
  TextContentTyp,
  UserRole,
} from "../../../../shared/src/enum";
import { SaveTextContentRequest } from "../../../../shared/src/types";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { TextContent } from "../../database/TextContent";
import { getUserFromContext } from "../getUserFromContext";

export const saveTextContent = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestTextContent = ctx.request.body as SaveTextContentRequest;

  switch (requestTextContent.category) {
    case TextContentCategory.IMPRINT:
    case TextContentCategory.PRIVACY_NOTICE:
    case TextContentCategory.MAINTENANCE_MESSAGE:
    case TextContentCategory.FAQ:
    case TextContentCategory.ORGANIZATION_INFO:
      await updateTextContent(
        ctx,
        requestTextContent.category,
        requestTextContent.content,
        requestTextContent.id,
        requestTextContent.title,
      );
      break;
    default:
      ctx.status = http.bad_request;
  }
};

const updateTextContent = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
  category: TextContentCategory,
  content: string,
  id?: number,
  title?: string,
) => {
  const repository = AppDataSource.getRepository(TextContent);
  const isStaticEntry = category != TextContentCategory.FAQ;
  const create = !id && !isStaticEntry;

  let textContent: TextContent | null;
  if (create) {
    textContent = new TextContent();
    textContent.typ = TextContentTyp.MD;
    textContent.category = category;
  } else {
    const query = id ? { category, id } : { category };
    textContent = await repository.findOneBy(query);
    if (!textContent) {
      ctx.throw(http.bad_request);
    }
  }

  if (title && !isStaticEntry) {
    textContent.title = title;
  }
  textContent.content = content;

  await repository.save(textContent);
  ctx.status = create ? http.created : http.no_content;
};
