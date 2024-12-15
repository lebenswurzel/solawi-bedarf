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
import { marked } from "marked";
import { AppDataSource } from "../../database/database";
import { Order } from "../../database/Order";
import { User } from "../../database/User";
import {
  escapeHtmlEntities,
  prettyDateTime,
} from "../../../../shared/src/util/stringHelper";
import { getLangUnit } from "../../../../shared/src/util/unitHelper";
import { language } from "../../../../shared/src/lang/lang";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { interpolate } from "../../../../shared/src/lang/template";

const emailHtmlTemplate = `<html>
  <head>
    <style>
          table {
            border-collapse: collapse;
          }
          table, th, td {
            border: 1px solid #444;
          }
          th, td {
            text-align: left;
            padding: 8px;
          }
          th {
            background-color: #f2f2f2;
          }
          td:not(:first-child), th:not(:first-child) {
            text-align: right;
          }
        </style>
  </head>
  <body>
    {bodyContent}
  </body>
</html>`;

const escapeMdTableCell = (value: string): string => {
  return value.replace("|", "\\|");
};

export const buildOrderEmail = async (
  orderId: number,
  msrp: number,
  orderUser: User,
  config: RequisitionConfig,
  changingUser: User,
): Promise<{ html: string; subject: string }> => {
  const el = language.email.orderConfirmation;
  const order = await AppDataSource.getRepository(Order).findOne({
    where: {
      id: orderId,
    },
    relations: { orderItems: { product: true } },
  });

  if (!order) {
    throw new Error(`Order with ID ${orderId} not found.`);
  }

  const markdownTableHeader =
    "| Produkt | Häufigkeit | Menge |\n|--------------|-----------|-------|";

  const markdownTableRows = order.orderItems
    .map((item) => {
      const { product, value } = item;
      return `| ${escapeMdTableCell(product.name)} | ${product.frequency} | ${value} ${getLangUnit(product.unit)} |`;
    })
    .join("\n");

  const markdownTable = `${markdownTableHeader}\n${markdownTableRows}`;

  const changingUserNote =
    orderUser.id !== changingUser.id
      ? interpolate(el.changingUserNote, { username: changingUser.name })
      : "";

  const paragraphs = [
    `### Stand der Bedarfsanmeldung vom ${prettyDateTime(order.updatedAt)}`,
    `Mitglied: ${orderUser.name}`,
    `Beitrag: ${order.offer}€ (Berechneter Orientierungswert: ${msrp}€)`,
    `Mitgliedschaftsmodell als ${language.app.options.orderUserCategories[order.category].title}: ` +
      escapeHtmlEntities(
        language.app.options.orderUserCategories[order.category].subtitle,
      ),
    "#### Übersicht der bestellten Produkte",
    markdownTable,
    `<small>Order-ID: ${order.id}, erstmalig erstellt ${prettyDateTime(order.createdAt)}</small>`,
    changingUserNote,
    `*${el.disclaimer}*`,
  ];

  const markdownContent = paragraphs.join("\n\n");

  const html = await marked.parse(markdownContent);

  return {
    html: emailHtmlTemplate.replace("{bodyContent}", html),
    subject: interpolate(el.subject, {
      username: orderUser.name,
      season: config.name,
    }),
  };
};
