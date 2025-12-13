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
import { http } from "../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Order } from "../database/Order";
import { getUserFromContext } from "./getUserFromContext";
import { AppDataSource } from "../database/database";
import { FindOptionsWhere, LessThan, MoreThan } from "typeorm";
import {
  OrderPaymentType,
  UserRole,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  calculateOrderValidMonths,
  getMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp";
import { bi } from "./bi/bi";
import {
  getConfigIdFromQuery,
  getDateQueryParameter,
  getStringQueryParameter,
} from "../util/requestUtil";
import {
  Address,
  BankDetails,
  OrderOverviewApplicant,
  OrderOverviewWithApplicantItem,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { Applicant } from "../database/Applicant";
import { config } from "../config";
import {
  getSameOrNextThursday,
  prettyDateWithMonthAndYear,
} from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";

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

  const dateOfInterest = getDateQueryParameter(
    ctx.request.query,
    "dateOfInterest",
  );

  const configId = getConfigIdFromQuery(ctx);
  const overview = await getUserOrderOverview(
    configId,
    undefined,
    undefined,
    options.includes("with-applicant"),
    options.includes("with-payment-info"),
    dateOfInterest,
  );
  ctx.body = { overview };
};

export const getUserOrderOverview = async (
  configId: number,
  userId?: number,
  orderId?: number,
  withApplicant: boolean = false,
  withPaymentInfo: boolean = false,
  dateOfInterest?: Date,
): Promise<OrderOverviewWithApplicantItem[]> => {
  const { productsById } = await bi(configId);

  let whereDateOfInterest: FindOptionsWhere<Order> = {};
  if (dateOfInterest) {
    whereDateOfInterest = {
      validFrom: LessThan(dateOfInterest),
      validTo: MoreThan(dateOfInterest),
    };
  }

  const relations: any = {
    orderItems: {
      product: true,
    },
    user: true,
    depot: true,
    alternateDepot: true,
    requisitionConfig: true,
  };

  if (withPaymentInfo) {
    relations.paymentInfo = true;
  }

  const select: any = {
    offer: true,
    offerReason: true,
    category: true,
    categoryReason: true,
    validFrom: true,
    validTo: true,
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
  };

  if (withPaymentInfo) {
    select.paymentInfo = {
      paymentType: true,
      paymentRequired: true,
      paymentProcessed: true,
      amount: true,
      bankDetails: true,
    };
  }

  const orders = await AppDataSource.getRepository(Order).find({
    relations,
    where: {
      ...whereDateOfInterest,
      offer: MoreThan(0),
      requisitionConfigId: configId,
      userId,
      id: orderId,
    },
    select,
  });

  const getApplicantAddress = async (
    userId: number,
  ): Promise<OrderOverviewApplicant> => {
    if (!withApplicant) {
      return {
        realName: "",
        email: "",
        phone: "",
        street: "",
        postalcode: "",
        city: "",
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
    const addressData = JSON.parse(address?.address.address || "{}") as Address;
    const names = [addressData.firstname, addressData.lastname].filter(
      (n) => n,
    );
    return {
      realName: names.join(" "),
      email: addressData.email || "",
      phone: addressData.phone || "",
      street: addressData.street || "",
      postalcode: addressData.postalcode || "",
      city: addressData.city || "",
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
      const msrp = getMsrp(
        order.category,
        order.orderItems,
        productsById,
        calculateOrderValidMonths(
          order.validFrom,
          order.requisitionConfig.validTo,
          config.timezone,
        ),
      );

      let startMonth = null;
      if (
        order.validFrom &&
        order.validFrom.getTime() > order.requisitionConfig.validFrom.getTime()
      ) {
        startMonth = prettyDateWithMonthAndYear(
          getSameOrNextThursday(order.validFrom, config.timezone),
        );
      }
      const applicantData = await getApplicantAddress(order.user.id);

      let paymentData: {
        paymentType: OrderPaymentType;
        paymentRequired: boolean;
        paymentProcessed: boolean;
        amount: number;
        bankDetails: BankDetails;
      };
      if (withPaymentInfo && order.paymentInfo) {
        const bankDetails = JSON.parse(
          order.paymentInfo.bankDetails ||
            "{ accountHolder: '', iban: '', bankName: '' }",
        ) as BankDetails;
        paymentData = {
          paymentType: order.paymentInfo.paymentType,
          paymentRequired: order.paymentInfo.paymentRequired,
          paymentProcessed: order.paymentInfo.paymentProcessed,
          amount: order.paymentInfo.amount,
          bankDetails,
        };
      } else {
        // Return empty payment info if not requested or not available
        paymentData = {
          paymentType: OrderPaymentType.UNCONFIRMED,
          paymentRequired: false,
          paymentProcessed: false,
          amount: 0,
          bankDetails: {
            accountHolder: "",
            iban: "",
            bankName: "",
          },
        };
      }

      return {
        name: order.user.name,
        identifier: makeIdentifier(
          order.user.name,
          order.requisitionConfig.validFrom,
          order.requisitionConfig.validTo,
        ),
        depot: order.depot.name,
        alternateDepot: order.alternateDepot?.name,
        msrp: msrp.monthly.total,
        months: msrp.months,
        startMonth,
        offer: order.offer,
        offerReason: order.offerReason || "",
        category: order.category,
        categoryReason: order.categoryReason || "",
        seasonName: order.requisitionConfig.name,
        ...applicantData,
        ...paymentData,
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
