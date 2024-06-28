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
import { Applicant, User } from "../../../shared/src/types";

export const applicantCreatedAtDown = (a: Applicant, b: Applicant) => {
  if (a.createdAt && b.createdAt) {
    if (a.createdAt < b.createdAt) {
      return 1;
    }
    if (a.createdAt > b.createdAt) {
      return -1;
    }
    return 0;
  }
  if (a.createdAt) {
    return 1;
  }
  if (b.createdAt) {
    return -1;
  }
  return 0;
};

export const applicantCreatedAtUp = (a: Applicant, b: Applicant) => {
  if (a.createdAt && b.createdAt) {
    if (a.createdAt > b.createdAt) {
      return 1;
    }
    if (a.createdAt < b.createdAt) {
      return -1;
    }
    return 0;
  }
  if (a.createdAt) {
    return 1;
  }
  if (b.createdAt) {
    return -1;
  }
  return 0;
};

export const userAlphabeticalDown = (a: User, b: User) => {
  if (a.name > b.name) {
    return 1;
  }
  if (a.name < b.name) {
    return -1;
  }
  return 0;
};

export const faqAlphabeticalDown = (
  a: { title: string },
  b: { title: string },
) => {
  if (a.title > b.title) {
    return 1;
  }
  if (a.title < b.title) {
    return -1;
  }
  return 0;
};

export const userAlphabeticalUp = (a: User, b: User) => {
  if (a.name < b.name) {
    return 1;
  }
  if (a.name > b.name) {
    return -1;
  }
  return 0;
};
