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
import { Order } from "../../database/Order";
import { User } from "../../database/User";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template";
import { format } from "date-fns";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  Msrp,
  OrganizationInfo,
  SavedOrder,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  getSameOrNextThursday,
  prettyDateWithMonthAndYear,
} from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper";

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

function prettyDateTime(date: Date): string {
  return format(date, "dd.MM.yyyy, HH:mm:ss") + " Uhr";
}

function prettyDate(date: Date): string {
  return format(date, "dd.MM.yyyy");
}

const escapeMdTableCell = (value: string): string => {
  return value.replace("|", "\\|");
};

export const buildOrderEmail = async (
  bodyTemplate: string,
  order: SavedOrder,
  effectiveMsrp: Msrp,
  orderUser: User,
  seasonName: string,
  seasonValidFrom: Date,
  seasonValidTo: Date,
  changingUser: User,
  userName: string,
  updatedDate: Date,
  organizationInfo: OrganizationInfo,
  paymentMessage: string,
  timezone: string,
): Promise<{ html: string; subject: string }> => {
  const el = language.email.orderConfirmation;

  const changingUserNote =
    orderUser.id !== changingUser.id
      ? interpolate(el.changingUserNote, { userName: changingUser.name })
      : "";

  const contributionKindBulletPoint =
    order.category !== UserCategory.CAT130
      ? interpolate(el.contributionKindBulletPoint, {
          contributionKind: order.categoryReason || "*keine Angabe*",
        })
      : "";

  const relevantValidFromDate =
    order.validFrom && order.validFrom.getTime() > seasonValidFrom.getTime()
      ? order.validFrom
      : seasonValidFrom;
  const startMonth = prettyDateWithMonthAndYear(
    getSameOrNextThursday(relevantValidFromDate, timezone),
  );

  const emailBody = interpolate(
    bodyTemplate,
    {
      userName,
      solawiName: organizationInfo.address.name,
      solawiEmail: organizationInfo.address.email,
      appUrl: organizationInfo.appUrl,
      season: seasonName,
      seasonStart: prettyDate(seasonValidFrom),
      seasonEnd: prettyDate(seasonValidTo),
      offer: `${order.offer}€`,
      contributionModel:
        language.app.options.orderUserCategories[order.category].title,
      contributionKindBulletPoint,
      userId: orderUser.name,
      paymentMessage: paymentMessage,
      orderStartMonth: startMonth,
      orderValidMonths: effectiveMsrp.months.toString(),
    },
    true,
  );

  const paragraphs = [emailBody, changingUserNote];

  const { marked } = await import("marked");
  const html = await marked.parse(paragraphs.join("\n\n"));

  return {
    html: emailHtmlTemplate.replace("{bodyContent}", html),
    subject: interpolate(el.subject, {
      now: prettyDateTime(updatedDate),
      season: seasonName,
    }),
  };
};
