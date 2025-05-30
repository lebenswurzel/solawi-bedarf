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
import { hashPassword } from "../../security";
import { http } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { Applicant } from "../../database/Applicant";
import { UserAddress } from "../../database/UserAddress";
import { sendEmail } from "../email/email";
import { config } from "../../config";
import { getOrganizationInfo } from "../text/getOrganizationInfo";
import { Address } from "@lebenswurzel/solawi-bedarf-shared/src/types";

export const saveApplicant = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const request = ctx.request.body as {
    confirmGDPR: boolean;
    comment: string;
    password: string;
    address: {
      firstname: string;
      lastname: string;
      password: string;
      email: string;
      phone: string;
      street: string;
      postalcode: string;
      city: string;
    };
  };

  if (!request.confirmGDPR) {
    ctx.throw(http.bad_request);
  }

  if (
    !request.comment ||
    !request.password ||
    !request.address.firstname ||
    !request.address.lastname ||
    !request.address.email ||
    !request.address.phone ||
    !request.address.street ||
    !request.address.postalcode ||
    !request.address.city
  ) {
    ctx.throw(http.bad_request);
  }

  const activeRegisteredUsers = await AppDataSource.getRepository(
    Applicant,
  ).count({ where: { active: true } });

  if (activeRegisteredUsers > 200) {
    ctx.throw(http.bad_request);
  }

  const addressData: Address = {
    firstname: request.address.firstname,
    lastname: request.address.lastname,
    phone: request.address.phone,
    email: request.address.email,
    street: request.address.street,
    postalcode: request.address.postalcode,
    city: request.address.city,
  };
  const userAddress = new UserAddress();
  userAddress.active = false;
  userAddress.address = JSON.stringify(addressData);

  await AppDataSource.getRepository(UserAddress).save(userAddress);

  const applicant = new Applicant();
  applicant.confirmGDPR = request.confirmGDPR;
  applicant.comment = request.comment;
  applicant.hash = await hashPassword(request.password!);
  applicant.active = true;
  applicant.address = userAddress;

  await AppDataSource.getRepository(Applicant).save(applicant);

  // send email to ourselves
  sendEmail({
    sender: config.email.sender,
    receiver: config.email.receiver,
    subject: "Neuer Interessent",
    paragraphs: ["Ein neuer Interessent hat sich gemeldet."],
  });

  // send email to applicant
  if (config.email.sendConfirmation) {
    const organizationInfo = await getOrganizationInfo();
    const title = "Registrierung bestätigt";
    const paragraphs = [
      `Hallo,`,
      `danke, dass du dich beim ${organizationInfo.address.name} registriert hast. ` +
        "Wir werden deine Anmeldung zeitnah bearbeiten und du erhältst eine weitere Bestätigungsmail mit deinem Benutzernamen.",
      "Viele Grüße",
      `Die ehrenamtlichen Mitglieder vom ${organizationInfo.address.name}`,
    ];
    sendEmail({
      sender: config.email.sender,
      receiver: request.address.email,
      subject: title,
      paragraphs,
    });
  }

  ctx.status = http.created;
};
