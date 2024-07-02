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
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { TextContent } from "../../database/TextContent";
import { TextContentCategory, UserRole } from "../../../../shared/src/enum";

export const deleteTextContent = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestId = ctx.request.query["id"];
  if (!requestId || Array.isArray(requestId)) {
    ctx.throw(http.forbidden);
  }
  const id = parseInt(requestId);
  if (id) {
    await AppDataSource.getRepository(TextContent).delete({
      category: TextContentCategory.FAQ,
      id: id,
    });
    ctx.status = http.no_content;
  } else {
    ctx.status = http.bad_request;
  }
};
