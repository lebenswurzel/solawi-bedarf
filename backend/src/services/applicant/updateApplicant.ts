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
import { UserAddress } from "../../database/UserAddress";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const updateApplicant = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }

  const request = ctx.request.body as {
    name?: string;
    id: number;
  };

  const applicant = await AppDataSource.getRepository(Applicant).findOneBy({
    id: request.id,
  });
  if (!applicant || applicant.userId) {
    ctx.throw(http.bad_request);
  }

  if (request.name) {
    if (applicant.active) {
      const user = new User();
      user.name = request.name;
      user.active = false;
      user.hash = applicant.hash;
      user.role = UserRole.USER;
      await AppDataSource.getRepository(User).save(user);
      applicant.active = false;
      applicant.user = user;
      await AppDataSource.getRepository(Applicant).save(applicant);
      ctx.status = http.created;
    } else {
      applicant.active = true;
      await AppDataSource.getRepository(Applicant).save(applicant);
      ctx.status = http.no_content;
    }
  } else {
    if (applicant.active) {
      applicant.active = false;
      await AppDataSource.getRepository(Applicant).save(applicant);
      ctx.status = http.no_content;
    } else {
      const address = await AppDataSource.getRepository(UserAddress).findOneBy({
        id: applicant.addressId,
      });
      await AppDataSource.getRepository(Applicant).remove(applicant, {});
      if (address) {
        await AppDataSource.getRepository(UserAddress).remove(address);
      }
      ctx.status = http.no_content;
    }
  }
};
