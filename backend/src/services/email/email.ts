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
import nodemailer from "nodemailer";
import { config } from "../../config";
import { appConfig } from "../../../../shared/src/config";
import { escapeHtmlEntities } from "../../../../shared/src/util/stringHelper";

let emailEnabled = false;

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port:
    typeof config.email.port === "number"
      ? config.email.port
      : parseInt(config.email.port),
  secure: false,
  requireTLS: true,
  auth: {
    user: config.email.username,
    pass: config.email.password,
  },
  logger: true,
});

const verifyEmail = () => {
  return new Promise((resolve, reject) => {
    transporter.verify(function (error, success) {
      if (error) {
        reject(error);
      } else {
        resolve("Server is ready to take our messages");
      }
    });
  });
};

export const sendEmail = async ({
  sender,
  receiver,
  subject,
  paragraphs,
  html,
}: {
  sender: string;
  receiver: string;
  subject: string;
  paragraphs: string[];
  html?: string;
}) => {
  if (emailEnabled) {
    if (html === undefined) {
      const content = paragraphs
        .map((v) => escapeHtmlEntities(v))
        .join("</p><p>");
      html =
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        `<title>${subject}</title></head><body><p>${content}</p></body></html>`;
    }

    const senderName = appConfig.address.name;
    const info = await transporter.sendMail({
      from: `"${senderName}" <${sender}>`,
      to: receiver,
      subject: subject,
      text: paragraphs.join("\n\n"),
      html: html,
      // headers: { "x-myheader": "test header" },
    });
    console.log("sendEmail", info);
  }
};

if (config.email.enabled) {
  console.log("Email enabled.");
  verifyEmail()
    .then(async (msg) => {
      console.log(msg);
      emailEnabled = true;
    })
    .catch((err) => {
      console.log(err);
    });
}
