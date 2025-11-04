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
import { UserAddress } from "../../database/UserAddress";
import { getNumericQueryParameter } from "../../util/requestUtil";
import { User } from "../../database/User";

export const deleteApplicant = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }

  const applicantId = getNumericQueryParameter(ctx.request.query, "id");
  if (!applicantId) {
    ctx.throw(http.bad_request, "Applicant ID is required");
  }

  const applicant = await AppDataSource.getRepository(Applicant).findOneBy({
    id: applicantId,
  });

  if (!applicant) {
    ctx.throw(http.bad_request, "Applicant not found");
  }

  if (applicant.active) {
    ctx.throw(
      http.bad_request,
      "Active applicants cannot be deleted. Deactivate first.",
    );
  }

  await AppDataSource.transaction(async (entityManager) => {
    // set user deleted flag
    const user = await entityManager.findOneBy(User, {
      id: applicant.userId,
    });
    if (user) {
      user.deleted = true;
      user.active = false;
      await entityManager.save(user);
    }

    const address = await entityManager.findOneBy(UserAddress, {
      id: applicant.addressId,
    });

    await entityManager.remove(applicant);
    if (address) {
      await entityManager.remove(address);
    }
  });

  ctx.status = http.no_content;
};
