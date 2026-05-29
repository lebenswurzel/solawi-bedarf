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
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { isValidVatRate } from "@lebenswurzel/solawi-bedarf-shared/src/commercial/pricing";
import {
  CommercialDeliveryRequest,
  Id,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { CommercialDelivery } from "../../database/CommercialDelivery";
import { CommercialDeliveryItem } from "../../database/CommercialDeliveryItem";
import { User } from "../../database/User";
import { Product } from "../../database/Product";
import { getUserFromContext } from "../getUserFromContext";
import { mapCommercialDelivery } from "./mapCommercialDelivery";
import { validateCommercialProfile } from "../user/commercialProfile";

const validateItems = async (
  items: CommercialDeliveryRequest["items"],
): Promise<void> => {
  if (!items || items.length === 0) {
    throw new Error("At least one delivery item is required");
  }
  for (const item of items) {
    if (!item.productId) {
      throw new Error("productId is required");
    }
    const product = await AppDataSource.getRepository(Product).findOneBy({
      id: item.productId,
    });
    if (!product) {
      throw new Error(`product ${item.productId} not found`);
    }
    if (item.quantity <= 0) {
      throw new Error("quantity must be positive");
    }
    if (item.unitPriceCents < 0) {
      throw new Error("unit price must not be negative");
    }
    if (!isValidVatRate(item.vatRate)) {
      throw new Error("invalid vat rate");
    }
  }
};

export const saveCommercialDelivery = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }

  const request = ctx.request.body as CommercialDeliveryRequest & Id;

  const customer = await AppDataSource.getRepository(User).findOne({
    where: {
      id: request.customerUserId,
      role: UserRole.COMMERCIAL,
      active: true,
      deleted: false,
    },
    relations: { commercialProfile: true },
  });
  if (
    !customer ||
    !validateCommercialProfile(
      customer.commercialProfile
        ? {
            companyName: customer.commercialProfile.companyName,
            street: customer.commercialProfile.street,
            postalcode: customer.commercialProfile.postalcode,
            city: customer.commercialProfile.city,
          }
        : null,
    )
  ) {
    ctx.throw(http.bad_request, "invalid commercial customer");
  }

  try {
    await validateItems(request.items);
  } catch (error: any) {
    ctx.throw(http.bad_request, error.message);
  }

  const savedDelivery = await AppDataSource.transaction(
    async (transactionalEntityManager) => {
      let delivery: CommercialDelivery | null = null;
      if (request.id) {
        delivery = await transactionalEntityManager
          .getRepository(CommercialDelivery)
          .findOne({
            where: { id: request.id },
            relations: { invoice: true, items: true },
          });
        if (!delivery) {
          ctx.throw(http.bad_request, "delivery not found");
        }
        if (
          delivery.invoice &&
          request.updatedAt &&
          new Date(request.updatedAt) < delivery.updatedAt
        ) {
          ctx.throw(http.bad_request, "outdated delivery");
        }
        if (delivery.invoice) {
          const existingItems = delivery.items || [];
          if (existingItems.length !== request.items.length) {
            ctx.throw(
              http.bad_request,
              "cannot change items after invoice was created",
            );
          }
        } else if (
          request.updatedAt &&
          new Date(request.updatedAt) < delivery.updatedAt
        ) {
          ctx.throw(http.bad_request, "outdated delivery");
        }

        await transactionalEntityManager
          .getRepository(CommercialDeliveryItem)
          .delete({ commercialDeliveryId: delivery.id });
      } else {
        delivery = new CommercialDelivery();
      }

      delivery!.deliveryDate = new Date(request.deliveryDate);
      delivery!.customer = customer;
      delivery!.description = request.description;
      delivery!.active = request.active;

      const saved = await transactionalEntityManager
        .getRepository(CommercialDelivery)
        .save(delivery!);

      const items = request.items.map((item) => {
        const entity = new CommercialDeliveryItem();
        entity.commercialDeliveryId = saved.id;
        entity.productId = item.productId;
        entity.quantity = item.quantity;
        entity.unit = item.unit;
        entity.conversionFrom = item.conversionFrom ?? 1;
        entity.conversionTo = item.conversionTo ?? 1;
        entity.unitPriceCents = item.unitPriceCents;
        entity.vatRate = item.vatRate;
        entity.isBio = item.isBio;
        entity.description = item.description;
        return entity;
      });
      await transactionalEntityManager
        .getRepository(CommercialDeliveryItem)
        .save(items);

      return transactionalEntityManager
        .getRepository(CommercialDelivery)
        .findOneOrFail({
          where: { id: saved.id },
          relations: {
            items: true,
            customer: { commercialProfile: true },
            invoice: true,
          },
        });
    },
  );

  ctx.body = mapCommercialDelivery(savedDelivery);
};
