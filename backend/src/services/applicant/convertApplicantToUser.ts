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
import { User } from "../../database/User";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const convertApplicantToUser = async (
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

  const request = ctx.request.body as {
    name: string;
  };

  if (!request.name) {
    ctx.throw(http.bad_request, "Name is required");
  }

  const applicant = await AppDataSource.getRepository(Applicant).findOneBy({
    id: applicantId,
  });

  if (!applicant || applicant.userId) {
    ctx.throw(http.bad_request, "Applicant not found or already converted");
  }

  if (!applicant.active) {
    ctx.throw(
      http.bad_request,
      "Only active applicants can be converted to users",
    );
  }

  await AppDataSource.transaction(async (entityManager) => {
    const user = new User(request.name, applicant.hash, UserRole.USER, false);
    await entityManager.save(user);

    applicant.active = false;
    applicant.user = user;
    await entityManager.save(applicant);
  });

  ctx.status = http.created;
};
