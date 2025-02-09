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
import { buildInfo } from "../../../shared/src/buildInfo";
import { VersionInfo } from "../../../shared/src/types";
import { AppDataSource } from "../database/database";
import { TextContent } from "../database/TextContent";
import { TextContentCategory } from "../../../shared/src/enum";
import { getTokenValidity } from "./getUserFromContext";

export const getVersion = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const tokenValidUntil = getTokenValidity(ctx);
  const maintenanceMessage: TextContent | null =
    await AppDataSource.getRepository(TextContent).findOne({
      where: { category: TextContentCategory.MAINTENANCE_MESSAGE },
    });

  const response: VersionInfo = {
    buildInfo: {
      ...buildInfo,
      maintenance: {
        enabled: !!maintenanceMessage?.content,
        message: maintenanceMessage?.content || "",
      },
    },
    tokenValidUntil,
  };
  ctx.body = response as VersionInfo;
};
