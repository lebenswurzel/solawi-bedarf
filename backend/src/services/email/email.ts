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
  text,
  html,
}: {
  sender: string;
  receiver: string;
  subject: string;
  text: string;
  html: string;
}) => {
  if (emailEnabled) {
    const senderName = "Plantage";
    const info = await transporter.sendMail({
      from: `"${senderName}" <${sender}>`,
      to: receiver,
      subject: subject,
      text: text,
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
