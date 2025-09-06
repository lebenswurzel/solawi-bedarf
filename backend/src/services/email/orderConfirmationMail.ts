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
import { toZonedTime } from "date-fns-tz";
import { AppDataSource } from "../../database/database";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { User } from "../../database/User";
import { sendEmail } from "./email";
import { buildOrderEmail } from "./emailHelper";
import { getUserOrderOverview } from "../getOverview";
import { getProductCategories } from "../product/getProductCategory";
import { getOrganizationInfo } from "../text/getOrganizationInfo";
import { formatDateForFilename } from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";
import { createDefaultPdf } from "@lebenswurzel/solawi-bedarf-shared/src/pdf/pdf";
import { generateUserData } from "@lebenswurzel/solawi-bedarf-shared/src/pdf/overviewPdfs";
import { config } from "../../config";
import { Order } from "../../database/Order";
import {
  getBankTransferMessage,
  getSepaUpdateMessage,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition";
import { TextContentCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { TextContent } from "../../database/TextContent";
import {
  makeFlatOrganizationInfo,
  makeOrganizationInfo,
} from "@lebenswurzel/solawi-bedarf-shared/src/text/textContent";

interface SendOrderConfirmationMailParams {
  order: Order;
  previousOrder: Order | null;
  requestUserId: number;
  changingUserId: number;
  requisitionConfig: RequisitionConfig;
  sendConfirmationEmail: boolean;
  confirmSepaUpdate: boolean;
  confirmBankTransfer: boolean;
}

export const sendOrderConfirmationMail = async ({
  order,
  previousOrder,
  requestUserId,
  changingUserId,
  requisitionConfig,
  sendConfirmationEmail,
  confirmSepaUpdate,
  confirmBankTransfer,
}: SendOrderConfirmationMailParams): Promise<void> => {
  // Only send email if confirmation is requested or BCC receiver is configured
  if (!sendConfirmationEmail && !config.email.orderUpdatedBccReceiver) {
    return;
  }

  const orderUser = await AppDataSource.getRepository(User).findOneOrFail({
    where: { id: requestUserId },
    relations: {
      applicant: {
        address: true,
      },
    },
  });

  const organizationInfo = await getOrganizationInfo();
  const organizationInfoFlat = makeFlatOrganizationInfo(organizationInfo);

  let changingUser = orderUser;
  if (requestUserId !== changingUserId) {
    changingUser = await AppDataSource.getRepository(User).findOneOrFail({
      where: { id: changingUserId },
    });
  }

  let orderUserEmail: string | undefined = undefined;
  let orderUserFirstname: string = orderUser.name;

  if (orderUser.applicant && sendConfirmationEmail) {
    // can only send email to user if his email address is in the database
    const address = JSON.parse(orderUser.applicant.address.address) as {
      email?: string;
      firstname?: string;
    };

    if (address.email) {
      orderUserEmail = address.email;
    }
    if (address.firstname) {
      orderUserFirstname = address.firstname;
    }
  }

  const currentDate = toZonedTime(new Date(), config.timezone);

  let paymentMessage: string = "Keine Angabe";
  if (confirmSepaUpdate) {
    paymentMessage = getSepaUpdateMessage(
      order.validFrom ?? new Date(),
      order.validTo ?? new Date(),
      order.offer,
      previousOrder?.offer ?? 0,
      organizationInfoFlat,
    );
  } else if (confirmBankTransfer) {
    const bankTransferMessage = getBankTransferMessage(
      order.validFrom ?? new Date(),
      order.validTo ?? new Date(),
      requisitionConfig.validFrom,
      requisitionConfig.validTo,
      order.offer,
      previousOrder?.offer ?? 0,
      orderUser.name,
      organizationInfo.bankAccount,
      config.timezone,
    );
    paymentMessage =
      bankTransferMessage.message +
      "\n\n```\n" +
      bankTransferMessage.accountDetails +
      "\n```";
  }

  const { html, subject } = await buildOrderEmail(
    order,
    orderUser,
    requisitionConfig.name,
    toZonedTime(requisitionConfig.validFrom, config.timezone),
    toZonedTime(requisitionConfig.validTo, config.timezone),
    changingUser,
    orderUserFirstname,
    currentDate,
    organizationInfo,
    paymentMessage,
  );

  // create overview pdf
  const overview = await getUserOrderOverview(
    requisitionConfig.id,
    requestUserId,
    order.id,
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
            filename: `Bedarfsanmeldung ${orderUser.name} ${formatDateForFilename(currentDate)}.pdf`,
            data: pdfBlob,
          },
        ]
      : undefined,
  });
};
