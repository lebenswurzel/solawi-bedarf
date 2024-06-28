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
import { getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { TextContent } from "../../database/TextContent";
import {
  UserRole,
  TextContentCategory,
  TextContentTyp,
} from "../../../../shared/src/enum";

export const saveTextContent = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestTextContent = ctx.request.body as {
    id?: number;
    title: string;
    category: TextContentCategory;
    content: string;
  };
  if (requestTextContent.category == TextContentCategory.IMPRINT) {
    const imprint = await AppDataSource.getRepository(TextContent).findOneBy({
      category: TextContentCategory.IMPRINT,
    });
    imprint!.content = requestTextContent.content;
    await AppDataSource.getRepository(TextContent).save(imprint!);
    ctx.status = http.no_content;
  } else if (
    requestTextContent.category == TextContentCategory.PRIVACY_NOTICE
  ) {
    const privacyNotice = await AppDataSource.getRepository(
      TextContent,
    ).findOneBy({
      category: TextContentCategory.PRIVACY_NOTICE,
    });
    privacyNotice!.content = requestTextContent.content;
    await AppDataSource.getRepository(TextContent).save(privacyNotice!);
    ctx.status = http.no_content;
  } else if (
    requestTextContent.category == TextContentCategory.FAQ &&
    requestTextContent.id
  ) {
    const faq = await AppDataSource.getRepository(TextContent).findOneBy({
      category: TextContentCategory.FAQ,
      id: requestTextContent.id,
    });
    if (!faq) {
      ctx.throw(http.bad_request);
    } else {
      faq.title = requestTextContent.title;
      faq.content = requestTextContent.content;
      await AppDataSource.getRepository(TextContent).save(faq);
      ctx.status = http.no_content;
    }
  } else if (requestTextContent.category == TextContentCategory.FAQ) {
    const faq = new TextContent();
    faq.active = true;
    faq.category = TextContentCategory.FAQ;
    faq.typ = TextContentTyp.MD;
    faq.title = requestTextContent.title;
    faq.content = requestTextContent.content;
    await AppDataSource.getRepository(TextContent).save(faq);
    ctx.status = http.created;
  } else {
    ctx.status = http.bad_request;
  }
};
