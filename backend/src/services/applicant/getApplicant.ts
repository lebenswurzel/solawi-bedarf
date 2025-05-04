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
import { Applicant } from "../../database/Applicant";
import { User } from "../../database/User";
import { FindOptionsWhere, IsNull, Not } from "typeorm";
import {
  ApplicantState,
  UserRole,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Address } from "@lebenswurzel/solawi-bedarf-shared/src/types";

const getWhere = (
  applicantState: ApplicantState,
): FindOptionsWhere<Applicant> => {
  switch (applicantState) {
    case ApplicantState.NEW:
      return { active: true };
    case ApplicantState.DELETED:
      return { active: false, userId: IsNull() };
    case ApplicantState.CONFIRMED:
      return { active: false, userId: Not(IsNull()) };
  }
};

export const getApplicant = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const state = ctx.request.query["state"];

  if (!state || Array.isArray(state)) {
    ctx.throw(http.bad_request);
  }

  const applicantState = ApplicantState[state as keyof typeof ApplicantState];

  const users = await AppDataSource.getRepository(User).find({
    select: { name: true },
  });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const year = `${currentMonth < 10 ? currentYear : currentYear + 1}`.substring(
    2,
  );
  const prefix = `LW${year}`;

  const maxId = users
    .map((u) => {
      try {
        if (u.name.startsWith(prefix)) {
          const lw = u.name.substring(4);
          return parseInt(lw);
        }
        return 0;
      } catch {
        return 0;
      }
    })
    .reduce((acc, cur) => Math.max(acc, cur), 0);

  const applicants = await AppDataSource.getRepository(Applicant).find({
    order: { id: "ASC" },
    select: {
      id: true,
      address: {
        address: true,
      },
      comment: true,
      user: {
        name: true,
      },
      createdAt: true,
    },
    relations: {
      address: true,
      user: applicantState == ApplicantState.CONFIRMED,
    },
    where: getWhere(applicantState),
  });

  ctx.body = {
    applicants: applicants.map((u, idx) => {
      const address = JSON.parse(u.address.address) as Address;
      return {
        id: u.id,
        address: {
          firstname: address.firstname,
          lastname: address.lastname,
          phone: address.phone,
          email: address.email,
          street: address.street,
          postalcode: address.postalcode,
          city: address.city,
        },
        comment: u.comment,
        createdAt: u.createdAt,
        name:
          u.user?.name ||
          (applicantState == ApplicantState.DELETED
            ? "DELETED"
            : prefix + `${maxId + idx + 1}`.padStart(3, "0")),
      };
    }),
  };
};
