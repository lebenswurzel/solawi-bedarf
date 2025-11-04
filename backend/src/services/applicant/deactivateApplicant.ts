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
import { http } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Applicant } from "../../database/Applicant";
import { getUserFromContext } from "../getUserFromContext";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const deactivateApplicant = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }

  const applicantId = parseInt(ctx.params.id);
  if (!applicantId || isNaN(applicantId)) {
    ctx.throw(http.bad_request, "Invalid applicant ID");
  }

  const applicant = await AppDataSource.getRepository(Applicant).findOneBy({
    id: applicantId,
  });

  if (!applicant || applicant.userId) {
    ctx.throw(http.bad_request, "Applicant not found or already converted");
  }

  if (!applicant.active) {
    ctx.throw(http.bad_request, "Applicant is already inactive");
  }

  applicant.active = false;
  await AppDataSource.getRepository(Applicant).save(applicant);

  ctx.status = http.no_content;
};
