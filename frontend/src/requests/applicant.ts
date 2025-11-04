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
import { ApplicantState } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import {
  Applicant,
  ImportApplicantRequest,
  ImportApplicantsResponse,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const saveApplicant = async (applicant: Applicant) => {
  const response = await fetch(getUrl("/applicant"), {
    method: "POST",
    body: JSON.stringify(applicant),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const convertApplicantToUser = async (id: number, name: string) => {
  const response = await fetch(getUrl(`/applicant/${id}/convert-to-user`), {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const activateApplicant = async (id: number) => {
  const response = await fetch(getUrl(`/applicant/${id}/activate`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const deactivateApplicant = async (id: number) => {
  const response = await fetch(getUrl(`/applicant/${id}/deactivate`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const deleteApplicant = async (id: number) => {
  const response = await fetch(getUrl(`/applicant?id=${id}`), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const getApplicants = async (
  applicantState: ApplicantState,
): Promise<Applicant[]> => {
  const response = await fetch(getUrl(`/applicant?state=${applicantState}`), {
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);

  return (await response.json()).applicants as Applicant[];
};

export const importApplicantsData = async (
  data: ImportApplicantRequest[],
): Promise<ImportApplicantsResponse> => {
  const response = await fetch(getUrl("/applicant/import"), {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
  return (await response.json()) as ImportApplicantsResponse;
};
