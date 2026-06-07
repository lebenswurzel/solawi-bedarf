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
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { CommercialDelivery } from "../../database/CommercialDelivery";
import { Invoice } from "../../database/Invoice";
import { InvoiceSequence } from "../../database/InvoiceSequence";
import { getUserFromContext } from "../getUserFromContext";
import { getNumericQueryParameter } from "../../util/requestUtil";
import { getOrganizationInfo } from "../text/getOrganizationInfo";
import { mapCommercialDelivery } from "./mapCommercialDelivery";

const nextInvoiceNumber = async (year: number): Promise<string> => {
  const repo = AppDataSource.getRepository(InvoiceSequence);
  let sequence = await repo.findOneBy({ year });
  if (!sequence) {
    sequence = new InvoiceSequence();
    sequence.year = year;
    sequence.lastNumber = 0;
  }
  sequence.lastNumber += 1;
  await repo.save(sequence);
  return `${year}-${String(sequence.lastNumber).padStart(3, "0")}`;
};

export const createCommercialInvoice = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }

  const deliveryId = getNumericQueryParameter(ctx.request.query, "deliveryId");
  if (!deliveryId) {
    ctx.throw(http.bad_request, "deliveryId is required");
  }

  const delivery = await AppDataSource.getRepository(
    CommercialDelivery,
  ).findOne({
    where: { id: deliveryId },
    relations: {
      items: true,
      customer: { commercialProfile: true },
      invoice: true,
    },
  });
  if (!delivery) {
    ctx.throw(http.not_found);
  }
  if (!delivery.items || delivery.items.length === 0) {
    ctx.throw(http.bad_request, "delivery has no items");
  }
  if (delivery.invoice) {
    ctx.body = {
      invoice: {
        invoiceNumber: delivery.invoice.invoiceNumber,
        bioControlNumber: delivery.invoice.bioControlNumber,
        createdAt: delivery.invoice.createdAt,
      },
      delivery: mapCommercialDelivery(delivery),
    };
    return;
  }

  const organizationInfo = await getOrganizationInfo();
  const year = new Date().getFullYear();

  const invoice = await AppDataSource.transaction(async (manager) => {
    const lockedDelivery = await manager
      .getRepository(CommercialDelivery)
      .findOne({
        where: { id: deliveryId },
        relations: { invoice: true },
      });
    if (!lockedDelivery) {
      ctx.throw(http.not_found);
    }
    if (lockedDelivery.invoice) {
      return lockedDelivery.invoice;
    }

    const invoiceEntity = new Invoice();
    invoiceEntity.commercialDeliveryId = deliveryId;
    invoiceEntity.invoiceNumber = await nextInvoiceNumber(year);
    invoiceEntity.bioControlNumber = organizationInfo.bioControlNumber;
    return manager.getRepository(Invoice).save(invoiceEntity);
  });

  const updatedDelivery = await AppDataSource.getRepository(
    CommercialDelivery,
  ).findOneOrFail({
    where: { id: deliveryId },
    relations: {
      items: true,
      customer: { commercialProfile: true },
      invoice: true,
    },
  });

  ctx.body = {
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      bioControlNumber: invoice.bioControlNumber,
      createdAt: invoice.createdAt,
    },
    delivery: mapCommercialDelivery(updatedDelivery),
  };
};
