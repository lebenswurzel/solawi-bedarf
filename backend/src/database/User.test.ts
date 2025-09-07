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

import { User } from "./User";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addHours } from "date-fns";
import { comparePassword } from "../security";

const INITIAL_PASSWORD_HASH = "OLD HASH";

function newTester(): User {
  return new User("Tester", INITIAL_PASSWORD_HASH, UserRole.USER, true);
}

describe("password reset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("start generates token", async () => {
    const tester = newTester();

    expect((await tester.startPasswordReset()).token).toHaveLength(128);
  });

  it("accepts valid token", async () => {
    const tester = newTester();
    const start = new Date();
    vi.setSystemTime(start);
    let reset = await tester.startPasswordReset();

    vi.setSystemTime(addHours(start, 23));
    expect(await tester.resetPassword(reset.token, "PWD")).true;
  });

  it("changes hash", async () => {
    const tester = newTester();
    let reset = await tester.startPasswordReset();

    await tester.resetPassword(reset.token, "PWD");

    expect(await comparePassword("PWD", tester.hash)).true;
  });

  it("not accepts invalid token", async () => {
    const tester = newTester();
    const token = await tester.startPasswordReset();

    expect(await tester.resetPassword(token + "+", "PWD")).false;
    expect(tester.hash).eq(INITIAL_PASSWORD_HASH);
  });

  it("not accepts no token", async () => {
    const tester = newTester();

    expect(await tester.resetPassword(null, "PWD")).false;
    expect(tester.hash).eq(INITIAL_PASSWORD_HASH);
  });

  it("not accepts expired token", async () => {
    const tester = newTester();

    const start = new Date();
    vi.setSystemTime(start);
    let reset = await tester.startPasswordReset();

    vi.setSystemTime(addHours(start, 25));
    expect(await tester.resetPassword(reset.token, "PWD")).false;
    expect(tester.hash).eq(INITIAL_PASSWORD_HASH);
  });

  it("not reaccepts token", async () => {
    const tester = newTester();
    let reset = await tester.startPasswordReset();

    await tester.resetPassword(reset.token, "PWD1");
    const last = await tester.resetPassword(reset.token, "PWD2");

    expect(last).false;
    expect(await comparePassword("PWD1", tester.hash)).true;
  });
});
