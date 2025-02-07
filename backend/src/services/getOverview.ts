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
import { http } from "..//consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Order } from "../database/Order";
import { getUserFromContext } from "./getUserFromContext";
import { AppDataSource } from "../database/database";
import { MoreThan } from "typeorm";
import { UserRole } from "../../../shared/src/enum";
import { getMsrp } from "../../../shared/src/msrp";
import { bi } from "./bi/bi";
import {
  getConfigIdFromQuery,
  getStringQueryParameter,
} from "../util/requestUtil";
import {
  OrderOverviewApplicant,
  OrderOverviewWithApplicantItem,
} from "../../../shared/src/types";
import { EncryptedUserAddress } from "../consts/types";
import { Applicant } from "../database/Applicant";

export const getOverview = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const options = getStringQueryParameter(
    ctx.request.query,
    "options",
    "",
  ).split(",");

  const configId = getConfigIdFromQuery(ctx);
  const overview = await getUserOrderOverview(
    configId,
    undefined,
    options.includes("with-applicant"),
  );
  ctx.body = { overview };
};

export const getUserOrderOverview = async (
  configId: number,
  userId?: number,
  withApplicant: boolean = false,
): Promise<OrderOverviewWithApplicantItem[]> => {
  const { productsById } = await bi(configId);
  const orders = await AppDataSource.getRepository(Order).find({
    relations: {
      orderItems: {
        product: true,
      },
      user: true,
      depot: true,
      alternateDepot: true,
      requisitionConfig: true,
    },
    where: {
      offer: MoreThan(0),
      requisitionConfigId: configId,
      userId,
    },
    select: {
      offer: true,
      offerReason: true,
      category: true,
      categoryReason: true,
      depot: {
        name: true,
      },
      alternateDepot: {
        name: true,
      },
      user: {
        name: true,
        id: true,
      },
      orderItems: {
        productId: true,
        value: true,
      },
      requisitionConfig: {
        name: true,
        validFrom: true,
        validTo: true,
      },
    },
  });

  const getApplicantAddress = async (
    userId: number,
  ): Promise<OrderOverviewApplicant> => {
    if (!withApplicant) {
      return {
        realName: "",
        email: "",
        phone: "",
      };
    }
    const address = await AppDataSource.getRepository(Applicant).findOne({
      relations: {
        address: true,
      },
      where: {
        userId: userId || -1,
      },
      select: {
        address: {
          address: true,
        },
      },
    });
    const addressData = JSON.parse(
      address?.address.address || "{}",
    ) as EncryptedUserAddress;
    const names = [addressData.firstname, addressData.lastname].filter(
      (n) => n,
    );
    return {
      realName: names.join(" "),
      email: addressData.email || "",
      phone: addressData.phone || "",
    };
  };

  const makeIdentifier = (userName: string, validFrom: Date, validTo: Date) => {
    // return an identifier that is unique for the user and the season
    const fromYear = validFrom.getFullYear() % 100;
    const toYear = validTo.getFullYear() % 100;
    return `${userName}_${fromYear}-${toYear}`;
  };

  return Promise.all(
    orders.map(async (order) => {
      const msrp = getMsrp(order.category, order.orderItems, productsById);

      const applicantData = await getApplicantAddress(order.user.id);
      return {
        name: order.user.name,
        identifier: makeIdentifier(
          order.user.name,
          order.requisitionConfig.validFrom,
          order.requisitionConfig.validTo,
        ),
        depot: order.depot.name,
        alternateDepot: order.alternateDepot?.name,
        msrp: msrp.total,
        offer: order.offer,
        offerReason: order.offerReason || "",
        category: order.category,
        categoryReason: order.categoryReason || "",
        seasonName: order.requisitionConfig.name,
        ...applicantData,
        items: order.orderItems.map((orderItem) => ({
          name: orderItem.product.name,
          value: orderItem.value,
          unit: orderItem.product.unit,
          category: orderItem.product.productCategoryId,
        })),
      };
    }),
  );
};
