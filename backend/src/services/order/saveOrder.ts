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
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Koa from "koa";
import Router from "koa-router";
import { LessThan } from "typeorm";
import { appConfig } from "../../../../shared/src/config";
import { getMsrp } from "../../../../shared/src/msrp";
import { generateUserData } from "../../../../shared/src/pdf/overviewPdfs";
import { createDefaultPdf } from "../../../../shared/src/pdf/pdf";
import { ConfirmedOrder } from "../../../../shared/src/types";
import {
  getRemainingDepotCapacity,
  isOrderItemValid,
} from "../../../../shared/src/validation/capacity";
import {
  isCategoryReasonValid,
  isOfferReasonValid,
  isOfferValid,
} from "../../../../shared/src/validation/reason";
import {
  isRequisitionActive,
  isValidBiddingOrder,
} from "../../../../shared/src/validation/requisition";
import { config } from "../../config";
import { http } from "../../consts/http";
import { EncryptedUserAddress } from "../../consts/types";
import { AppDataSource } from "../../database/database";
import { Depot } from "../../database/Depot";
import { Order } from "../../database/Order";
import { OrderItem } from "../../database/OrderItem";
import { ProductCategory } from "../../database/ProductCategory";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { User } from "../../database/User";
import { bi } from "../bi/bi";
import { sendEmail } from "../email/email";
import { buildOrderEmail } from "../email/emailHelper";
import { getUserOrderOverview } from "../getOverview";
import { getRequestUserId, getUserFromContext } from "../getUserFromContext";
import { getProductCategories } from "../product/getProductCategory";
import { getOrganizationInfo } from "../text/getOrganizationInfo";

export const saveOrder = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const now = new Date();
  const { role, active, id } = await getUserFromContext(ctx);
  const requestUserId = await getRequestUserId(ctx);
  const body = ctx.request.body as ConfirmedOrder;
  const sendConfirmationEmail = body.sendConfirmationEmail || false;

  const configId = body.requisitionConfigId;
  if (configId < 1) {
    ctx.throw(http.bad_request, `missing or bad config id (${configId})`);
  }

  const requisitionConfig = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOne({
    where: { id: configId },
  });
  if (!requisitionConfig) {
    ctx.throw(http.bad_request, `no valid config (id=${configId})`);
  }
  if (!body.confirmGTC) {
    ctx.throw(http.bad_request, "commitment not confirmed");
  }
  if (!appConfig.availableCategories.includes(body.category)) {
    ctx.throw(http.bad_request, "no valid category");
  }

  if (!isRequisitionActive(role, active, requisitionConfig, now)) {
    ctx.throw(http.bad_request, "requisition not active");
  }
  if (!isCategoryReasonValid(body.category, body.categoryReason)) {
    ctx.throw(http.bad_request, "no category reason");
  }
  const depot = await AppDataSource.getRepository(Depot).findOne({
    // '.. || 0' to make sure a value of undefined does not return the first table row
    where: { id: body.depotId || 0 },
  });
  if (!depot || !depot.active) {
    ctx.throw(http.bad_request, "no valid depot");
  }
  let order = await AppDataSource.getRepository(Order).findOne({
    where: { userId: requestUserId, requisitionConfigId: configId },
    relations: { orderItems: true },
  });
  if (
    order &&
    !isValidBiddingOrder(role, requisitionConfig, now, order, body)
  ) {
    ctx.throw(http.bad_request, "not valid in bidding round");
  }
  const { soldByProductId, capacityByDepotId, productsById } = await bi(
    requisitionConfig.id,
  );
  const remainingDepotCapacity = getRemainingDepotCapacity(
    depot,
    capacityByDepotId[body.depotId].reserved,
    order?.depotId || 0,
  );
  if (remainingDepotCapacity != null && remainingDepotCapacity == 0) {
    ctx.throw(http.bad_request, "no depot capacity left");
  }
  if (
    body.orderItems.some(
      (actualOrderItem) =>
        !isOrderItemValid(
          order,
          actualOrderItem,
          soldByProductId,
          productsById,
        ),
    )
  ) {
    ctx.throw(http.bad_request, "order item invalid");
  }
  const msrp = getMsrp(body.category, body.orderItems, productsById);
  if (!isOfferValid(body.offer, msrp.total)) {
    ctx.throw(http.bad_request, "bid too low");
  }
  if (!isOfferReasonValid(body.offer, msrp.total, body.offerReason)) {
    ctx.throw(http.bad_request, "no offer reason");
  }
  const productCategories = await AppDataSource.getRepository(
    ProductCategory,
  ).find({
    relations: { products: true },
    where: { requisitionConfigId: configId },
  });

  if (!order) {
    order = new Order();
    order.userId = requestUserId;
    order.requisitionConfigId = configId;
  }

  order.offer = body.offer;
  order.depotId = body.depotId;
  order.alternateDepotId = body.alternateDepotId;
  order.productConfiguration = JSON.stringify(productCategories);
  order.offerReason = body.offerReason || "";
  order.category = body.category;
  order.categoryReason = body.categoryReason || "";
  await AppDataSource.getRepository(Order).save(order);

  for (const requestOrderItem of body.orderItems) {
    let item =
      order.orderItems &&
      order.orderItems.find(
        (orderItem) => orderItem.productId == requestOrderItem.productId,
      );
    if (item) {
      item.value = requestOrderItem.value;
      await AppDataSource.getRepository(OrderItem).save(item);
    } else {
      item = new OrderItem();
      item.productId = requestOrderItem.productId;
      item.orderId = order.id;
      item.value = requestOrderItem.value;
      await AppDataSource.getRepository(OrderItem).save(item);
    }
  }
  // cleanup of useless items
  await AppDataSource.getRepository(OrderItem).delete({ value: LessThan(1) });

  // Send confirmation email to user (if option is set) and always to the EMAIL_ORDERED_UPDATED_BCC (if set)
  if (sendConfirmationEmail || config.email.orderUpdatedBccReceiver) {
    const orderUser = await AppDataSource.getRepository(User).findOneOrFail({
      where: { id: requestUserId },
      relations: {
        applicant: {
          address: true,
        },
      },
    });
    let changingUser = orderUser;
    if (requestUserId !== id) {
      changingUser = await AppDataSource.getRepository(User).findOneOrFail({
        where: { id },
      });
    }

    let orderUserEmail: string | undefined = undefined;
    let orderUserFirstname: string = orderUser.name;
    if (orderUser.applicant && sendConfirmationEmail) {
      // can only send email to user if his email address is in the database
      const address = JSON.parse(
        orderUser.applicant.address.address,
      ) as EncryptedUserAddress;

      if (address.email) {
        orderUserEmail = address.email;
      }
      if (address.firstname) {
        orderUserFirstname = address.firstname;
      }
    }

    const currentDate = toZonedTime(new Date(), config.timezone);
    const organizationInfo = await getOrganizationInfo();

    const { html, subject } = await buildOrderEmail(
      order.id,
      orderUser,
      requisitionConfig.name,
      toZonedTime(requisitionConfig.validFrom, config.timezone),
      toZonedTime(requisitionConfig.validTo, config.timezone),
      changingUser,
      orderUserFirstname,
      currentDate,
      organizationInfo,
    );

    // create overview pdf
    const overview = await getUserOrderOverview(
      requisitionConfig.id,
      requestUserId,
    );
    const productCategories = await getProductCategories(requisitionConfig.id);
    const dataByUserAndProductCategory = generateUserData(
      overview,
      productCategories,
      requisitionConfig.name,
    );

    let pdfBlob: Blob | null = null;
    if (dataByUserAndProductCategory.length > 0) {
      const pdf = createDefaultPdf(
        dataByUserAndProductCategory[0],
        organizationInfo,
      );
      pdfBlob = await new Promise((resolve, _) => {
        pdf.getBlob((blob: Blob) => resolve(blob));
      });
    }

    sendEmail({
      sender: config.email.sender,
      receiver: orderUserEmail,
      subject,
      html,
      bcc: config.email.orderUpdatedBccReceiver,
      attachments: pdfBlob
        ? [
            {
              filename: `Bedarfsanmeldung ${orderUser.name} ${format(currentDate, "yyyy-MM-dd HH_mm_ss")}.pdf`,
              data: pdfBlob,
            },
          ]
        : undefined,
    });
  }

  ctx.status = http.no_content;
};
