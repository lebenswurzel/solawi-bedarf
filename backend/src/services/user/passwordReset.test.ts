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
import { describe, expect, MockInstance, test, vi } from "vitest";
import { PasswordResetService } from "./passwordReset";
import { EmailService, SendEmailRequest } from "../../ports/email";
import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { InfrastructureError, SolawiError } from "../../error";
import { TextContentRepo } from "../text/repo";
import { UserRepo } from "./repo";
import { User } from "../../database/User";
import { OrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Applicant } from "../../database/Applicant";
import { UserAddress } from "../../database/UserAddress";
import { comparePassword } from "../../security";
import { Token } from "../../database/Token";

const ORG_INFO: OrganizationInfo = {
  address: {
    city: "",
    email: "",
    forumContact: "",
    name: "",
    postalcode: "",
    street: "",
  },
  appUrl: "https://localhost:8080",
};

const USERNAME = "USERNAME";
const EMAIL = "user@example.org";
const PASSWORD = "aK96pwynfB689Nde";
const OLD_HASH = "HASH";

class FakedDependencies implements EmailService, TextContentRepo, UserRepo {
  user: User;

  constructor() {
    this.user = new User(USERNAME, OLD_HASH, UserRole.USER, true);
    this.user.id = 424242;
    this.user.applicant = new Applicant();
    this.user.applicant.address = new UserAddress();
    this.user.applicant.address.active = true;
    this.user.applicant.address.address = JSON.stringify({ email: EMAIL });
    this.user.passwordReset = Promise.resolve([]);
  }

  sendEmail(_: SendEmailRequest): ResultAsync<void, InfrastructureError> {
    return okAsync();
  }

  findUserByName(userName: string): Promise<User | null> {
    return Promise.resolve(this.user.name === userName ? this.user : null);
  }

  getOrganizationInfo(): Promise<OrganizationInfo> {
    return Promise.resolve(ORG_INFO);
  }

  saveUser(user: User): Promise<void> {
    if (this.user.id === user.id) {
      this.user = user;
    }
    return Promise.resolve();
  }

  async findUserByPasswordResetToken(token: string): Promise<User | null> {
    return (await this.user.passwordReset).some((pr) => pr.token === token)
      ? this.user
      : null;
  }
}

function mockSendEmail(
  dependencies: FakedDependencies,
): [MockInstance, { value: string }] {
  let tokenStore = { value: undefined };
  let mock = vi.spyOn(dependencies, "sendEmail").mockImplementation((email) => {
    let m = email.paragraphs.join("\n\n").match(/token=([a-zA-Z0-9]+)/);
    if (m) {
      tokenStore.value = m[1];
    }
    return undefined;
  });
  return [mock, tokenStore];
}

describe("password reset request", () => {
  test("should send e-mail", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    let [sendEmailMock, tokenStore] = mockSendEmail(dependencies);

    let service = new PasswordResetService(dependencies);

    // ACT
    const startResult = await service.beginPasswordReset(USERNAME);

    // ASSERT
    expect(startResult).toEqual(ok());
    expect(sendEmailMock).toHaveBeenCalled();
    expect(
      await dependencies.user.isPasswordResetTokenValid(tokenStore.value),
    ).toEqual(true);
  });

  test("should not return error on invalid user name to protect against user enumeration", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let service = new PasswordResetService(dependencies);

    // ACT
    let result = await service.beginPasswordReset("OTHER USER");

    // ASSERT
    expect(result).toEqual(ok());
  });

  test("should not send e-mail on invalid user name", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    let [sendEmailMock, _] = mockSendEmail(dependencies);

    let service = new PasswordResetService(dependencies);

    // ACT
    await service.beginPasswordReset("OTHER USER");

    // ASSERT
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("checking token", () => {
  test("should succeed on valid token", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let reset = await dependencies.user.startPasswordReset();

    let service = new PasswordResetService(dependencies);

    // ACT
    const checkResult = await service.checkPasswordResetToken(
      USERNAME,
      reset.token,
    );

    // ASSERT
    expect(checkResult).toEqual(ok());
  });

  test("should fail on invalid token", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let service = new PasswordResetService(dependencies);

    // ACT
    const checkResult = await service.checkPasswordResetToken(
      USERNAME,
      "INVALID",
    );

    // ASSERT
    expect(checkResult.mapErr((err) => err.code)).toEqual(err(409));
  });
});

describe("password reset", () => {
  test("should reset password", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let reset = await dependencies.user.startPasswordReset();

    let service = new PasswordResetService(dependencies);

    // ACT
    const endResult = await service.endPasswordReset(reset.token, PASSWORD);

    // ASSERT
    expect(endResult).toEqual(ok());
    expect(await comparePassword(PASSWORD, dependencies.user.hash)).true;
  });

  test("should reject invalid token", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    await dependencies.user.startPasswordReset();

    let service = new PasswordResetService(dependencies);

    // ACT
    const endResult = await service.endPasswordReset("WRONG", PASSWORD);

    // ASSERT
    expect(endResult).toEqual(
      err(SolawiError.invalidInput("request is invalid")),
    );
    expect(dependencies.user.hash).toEqual(OLD_HASH);
  });

  test("should send e-mail", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    let reset = await dependencies.user.startPasswordReset();
    let [sendEmailMock, _] = mockSendEmail(dependencies);

    let service = new PasswordResetService(dependencies);

    // ACT
    const endResult = await service.endPasswordReset(reset.token, PASSWORD);

    // ASSERT
    expect(endResult).toEqual(ok());
    expect(sendEmailMock).toHaveBeenCalled();
  });
});
