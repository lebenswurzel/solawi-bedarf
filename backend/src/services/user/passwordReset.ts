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

type Dependencies = EmailService & TextContentRepo & UserRepo;

export class PasswordResetService {
  private deps: Dependencies;

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
    return ok(addressData.email);
  }

  async beginPasswordReset(
    userName: string,
  ): Promise<Result<void, SolawiError>> {
    if (!userName) {
      return err(SolawiError.invalidInput("user name should not be empty"));
    }

    const user = await this.deps.findUserByName(userName);
    if (!user) {
      console.log("Password request rejected because of non-existing user");
      return ok(); // SEC: Protect against username enumeration
    }

    let userEmail = this.getEmail(user);
    if (userEmail.isErr()) {
      return err(userEmail.error);
    }

    const reset = await user.startPasswordReset();
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
      paragraphs: interpolate(
        text.body.join("\n\n"),
        {
          userName,
          solawiName: organizationInfo.address.name,
          passwordResetLink: `${organizationInfo.appUrl}/passwordReset?token=${reset.token}`, // TODO: url build service interface
        },
        false,
      ).split("\n\n"),
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

    let user = await this.deps.findUserByName(userName);
    if (!user) {
      return err(SolawiError.rejected("user does not exist"));
    }

    if (!(await user.isPasswordResetTokenValid(token))) {
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
  async endPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<Result<void, SolawiError>> {
    if (!token || !newPassword) {
      return err(SolawiError.invalidInput("invalid request"));
    }

    let user = await this.deps.findUserByPasswordResetToken(token);
    if (!user) {
      return err(SolawiError.rejected("user does not exist"));
    }

    if (!(await user.resetPassword(token, newPassword))) {
      return err(SolawiError.rejected("token invalid"));
    }

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
