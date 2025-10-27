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
import { Dependencies, PasswordResetService } from "./passwordReset";
import { EmailService, SendEmailRequest } from "../../ports/email";
import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { InfrastructureError, SolawiError } from "../../error";
import { TextContentRepo } from "../text/repo";
import { UserRepo } from "./repo";
import { User } from "../../database/User";
import {
  Address,
  OrganizationInfo,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Applicant } from "../../database/Applicant";
import { UserAddress } from "../../database/UserAddress";
import { comparePassword, hashPassword } from "../../security";
import { Token } from "../../database/Token";
import { TypeormTextContentRepo, TypeormUserRepo } from "../../adapter/typeorm";
import { AppDataSource } from "../../database/database";
import { mergeMethods } from "../../util/mergeMethods";
import { generateToken } from "./login";

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
    this.user.token = [];
    this.user.applicant = new Applicant();
    this.user.applicant.address = new UserAddress();
    this.user.applicant.address.active = true;
    this.user.applicant.address.address = JSON.stringify({
      email: EMAIL,
    } as Address);
    this.user.passwordResets = [];
  }

  removeUserEmailAddress() {
    this.user.applicant.address.address = null;
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
    return (await this.user.passwordResets).some((pr) => pr.token === token)
      ? this.user
      : null;
  }

  invalidateTokenForUser(userId: number): Promise<void> {
    if (userId === this.user.id) {
      this.user.token.forEach((token) => (token.active = false));
    }
    return Promise.resolve();
  }
}

function extractTokenFromHtml(email: SendEmailRequest): string | null {
  let m = email.paragraphs.join("\n\n").match(/token=([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function mockSendEmail(
  dependencies: FakedDependencies,
): [MockInstance, { value: string }] {
  let tokenStore = { value: undefined };
  let mock = vi.spyOn(dependencies, "sendEmail").mockImplementation((email) => {
    tokenStore.value = extractTokenFromHtml(email);
    return undefined;
  });
  return [mock, tokenStore];
}

function newPasswordResetService(dependencies: Dependencies) {
  let service = new PasswordResetService(dependencies);
  service.randomSleepTime = [0, 0];
  return service;
}

describe("password reset request", () => {
  test("should send e-mail", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    let [sendEmailMock, tokenStore] = mockSendEmail(dependencies);

    let service = newPasswordResetService(dependencies);

    // ACT
    const startResult = await service.requestPasswordReset(USERNAME);

    // ASSERT
    expect(startResult).toEqual(ok());
    expect(sendEmailMock).toHaveBeenCalled();
    expect(
      dependencies.user.isPasswordResetTokenValid(tokenStore.value),
    ).toEqual(true);
  });

  test("should not return error on invalid user name to protect against user enumeration", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let service = newPasswordResetService(dependencies);

    // ACT
    let result = await service.requestPasswordReset("OTHER USER");

    // ASSERT
    expect(result).toEqual(ok());
  });

  test("should not return error on missing email to protect against user enumeration", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    dependencies.removeUserEmailAddress();

    let service = newPasswordResetService(dependencies);

    // ACT
    let result = await service.requestPasswordReset(USERNAME);

    // ASSERT
    expect(result).toEqual(ok());
  });

  test("should not send e-mail on invalid user name", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    let [sendEmailMock, _] = mockSendEmail(dependencies);

    let service = newPasswordResetService(dependencies);

    // ACT
    await service.requestPasswordReset("OTHER USER");

    // ASSERT
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("checking token", () => {
  test("should succeed on valid token", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let reset = dependencies.user.createPasswordReset();

    let service = newPasswordResetService(dependencies);

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

    let service = newPasswordResetService(dependencies);

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

    let reset = dependencies.user.createPasswordReset();

    let service = newPasswordResetService(dependencies);

    // ACT
    const endResult = await service.resetPassword(reset.token, PASSWORD);

    // ASSERT
    expect(endResult).toEqual(ok());
    expect(await comparePassword(PASSWORD, dependencies.user.hash)).is.true;
  });

  test("should reject invalid token", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    dependencies.user.createPasswordReset();

    let service = newPasswordResetService(dependencies);

    // ACT
    const endResult = await service.resetPassword("WRONG", PASSWORD);

    // ASSERT
    expect(endResult).toEqual(
      err(SolawiError.invalidInput("request is invalid")),
    );
    expect(dependencies.user.hash).toEqual(OLD_HASH);
  });

  test("should send e-mail", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();
    let reset = dependencies.user.createPasswordReset();
    let [sendEmailMock, _] = mockSendEmail(dependencies);

    let service = newPasswordResetService(dependencies);

    // ACT
    const endResult = await service.resetPassword(reset.token, PASSWORD);

    // ASSERT
    expect(endResult).toEqual(ok());
    expect(sendEmailMock).toHaveBeenCalled();
  });

  test("should reset all existing sessions", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let reset = dependencies.user.createPasswordReset();
    let token = new Token();
    token.exp = new Date(Date.now() + 24 * 60 * 60 * 1000);
    token.active = true;
    dependencies.user.token = [token];

    let service = newPasswordResetService(dependencies);

    // ACT
    const endResult = await service.resetPassword(reset.token, PASSWORD);

    // ASSERT
    expect(endResult).toEqual(ok());
    expect(dependencies.user.token[0].active).is.false;
  });

  test("should only work once", async () => {
    // ARRANGE
    let dependencies = new FakedDependencies();

    let reset = dependencies.user.createPasswordReset();

    let service = newPasswordResetService(dependencies);

    // ACT
    const endResult1 = await service.resetPassword(reset.token, PASSWORD);
    const endResult2 = await service.resetPassword(reset.token, PASSWORD);

    // ASSERT
    expect(endResult1).toEqual(ok());
    expect(endResult2).toEqual(
      err(SolawiError.invalidInput("request is invalid")),
    );
  });
});

describe("password reset workflow", () => {
  class FakeEmailService implements EmailService {
    requests: SendEmailRequest[] = [];

    sendEmail(req: SendEmailRequest): ResultAsync<void, InfrastructureError> {
      this.requests.push(req);
      return okAsync();
    }
  }

  function setUpDeps(
    emailService: EmailService,
  ): EmailService & TextContentRepo & UserRepo {
    const userRepo = new TypeormUserRepo(AppDataSource);
    const textContentRepo = new TypeormTextContentRepo(AppDataSource);
    return mergeMethods(emailService, userRepo, textContentRepo);
  }

  test("should reset password", async () => {
    // ARRANGE
    const emailService = new FakeEmailService();
    let dependencies = setUpDeps(emailService);

    let service = newPasswordResetService(dependencies);

    let user = new User(
      USERNAME,
      await hashPassword(PASSWORD),
      UserRole.USER,
      true,
    );
    await dependencies.saveUser(user);

    await generateToken(user, false);

    const address = new UserAddress();
    address.active = true;
    address.address = JSON.stringify({
      email: "applicant@example.org",
    } as Address);
    await AppDataSource.getRepository(UserAddress).save(address);

    const applicant = new Applicant();
    applicant.user = user;
    applicant.hash = "";
    applicant.confirmGDPR = true;
    applicant.comment = "";
    applicant.active = true;
    applicant.address = address;
    await AppDataSource.getRepository(Applicant).save(applicant);

    // ACT

    // Request token
    expect(await service.requestPasswordReset(USERNAME)).toEqual(ok());

    // Use token from e-mail for reset
    const email = emailService.requests.pop();
    const passwordResetToken = extractTokenFromHtml(email);
    expect(
      await service.resetPassword(passwordResetToken, "NEWPASSWORD"),
    ).toEqual(ok());

    // The second attempt should fail
    expect(
      await service.resetPassword(passwordResetToken, "NEWPASSWORD"),
    ).toEqual(err(SolawiError.invalidInput("request is invalid")));

    // ASSERT

    // Password should be changed
    const hash = (await dependencies.findUserByName(USERNAME)).hash;
    expect(await comparePassword("NEWPASSWORD", hash)).true;

    // All tokens should be invalid
    const tokens = await AppDataSource.getRepository(Token).findBy({
      user: user,
    });
    expect(tokens.some((t) => t.active)).is.false;
  });
});
