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
import { User } from "../../database/User";
import { Address } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { SolawiError } from "../../error";
import { EmailService } from "../../ports/email";
import { config } from "../../config";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template";
import { err, ok, Result } from "neverthrow";
import { TextContentRepo } from "../text/repo";
import { UserRepo } from "./repo";
import { sleep } from "@lebenswurzel/solawi-bedarf-shared/src/util/awaitHelper";

export type Dependencies = EmailService & TextContentRepo & UserRepo;

export class PasswordResetService {
  private deps: Dependencies;
  public randomSleepTime: [number, number] = [25, 100];

  constructor(deps: Dependencies) {
    this.deps = deps;
  }

  private getEmail(user: User): Result<string, SolawiError> {
    const applicant = user.applicant;
    if (!applicant) {
      return err(SolawiError.rejected("user does not have an email address"));
    }

    const addressData = JSON.parse(
      applicant?.address.address || "{}",
    ) as Address;
    if (!addressData.email) {
      return err(SolawiError.rejected("user does not have an email address"));
    }

    return ok(addressData.email);
  }

  async requestPasswordReset(
    userName: string,
  ): Promise<Result<void, SolawiError>> {
    if (!userName) {
      return err(SolawiError.invalidInput("user name should not be empty"));
    }

    // SEC: Defense against timing attacks: sleep between 25–100 ms
    const delay =
      Math.random() * (this.randomSleepTime[1] - this.randomSleepTime[0]) +
      this.randomSleepTime[0];
    await sleep(delay);

    const user = await this.deps.findUserByName(userName, {
      applicant: { address: true },
      passwordResets: true,
    });
    if (!user) {
      console.log(
        "Password request rejected because of non-existing user",
        userName,
      );
      return ok(); // SEC: Protect against username enumeration
    }

    const userEmail = this.getEmail(user);
    if (userEmail.isErr()) {
      console.log(
        "Password request rejected because of missing email of",
        userName,
      );
      return ok(); // SEC: Protect against username enumeration
    }

    const reset = user.createPasswordReset();
    await this.deps.saveUser(user);

    const text = language.email.passwordResetRequest;
    const organizationInfo = await this.deps.getOrganizationInfo();
    if (!organizationInfo) {
      return err(SolawiError.internalError("no organization info"));
    }

    await this.deps.sendEmail({
      sender: config.email.sender,
      receiver: userEmail.value,
      subject: text.subject,
      html: interpolate(
        text.body.join("</p><p>"),
        {
          userName,
          appUrl: organizationInfo.appUrl,
          solawiName: organizationInfo.address.name,
          passwordResetLink: `${organizationInfo.appUrl}/#/resetpassword?token=${reset.token}`, // TODO: url build service interface
        },
        false,
      ),
    });

    return ok();
  }

  /**
   * Checks if the token is valid for the user.
   *
   * Call this method before asking the user for a new password.
   *
   * @param userName The username of the user who requested the password reset.
   * @param token The token to check.
   */
  async checkPasswordResetToken(
    userName: string,
    token: string,
  ): Promise<Result<void, SolawiError>> {
    if (!userName || !token) {
      return err(SolawiError.invalidInput("invalid request"));
    }

    const user = await this.deps.findUserByName(userName);
    if (!user) {
      return err(SolawiError.rejected("user does not exist"));
    }

    if (!user.isPasswordResetTokenValid(token)) {
      return err(SolawiError.rejected("token invalid"));
    }

    return ok();
  }

  /**
   * Ends the password reset process for the user.
   *
   * @param token The password reset token.
   * @param newPassword The new password to set for the user.
   * @returns A Result object indicating whether the password reset was successful or not.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<Result<void, SolawiError>> {
    if (!token || !newPassword) {
      return err(SolawiError.invalidInput("invalid request"));
    }

    const user = await this.deps.findUserByPasswordResetToken(token, {
      passwordResets: true,
      applicant: { address: true },
    });
    if (!user) {
      return err(SolawiError.invalidInput("request is invalid"));
    }

    if (!(await user.resetPassword(token, newPassword))) {
      return err(SolawiError.rejected("request is expired"));
    }

    await this.deps.invalidateTokenForUser(user.id);

    const text = language.email.passwordReset;
    const email = this.getEmail(user);
    if (email.isErr()) {
      return err(email.error);
    }

    await this.deps.saveUser(user);

    const organizationInfo = await this.deps.getOrganizationInfo();
    await this.deps.sendEmail({
      sender: config.email.sender,
      receiver: email.value,
      subject: text.subject,
      paragraphs: interpolate(
        text.body.join("\n\n"),
        {
          userName: user.name,
          solawiName: organizationInfo.address.name,
        },
        false,
      ).split("\n\n"),
    });

    return ok();
  }
}
