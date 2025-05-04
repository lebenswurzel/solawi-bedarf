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
import { http } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { getUserFromContext } from "../getUserFromContext";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  Address,
  ImportApplicantRequest,
  ImportApplicantsResponse,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { AppDataSource } from "../../database/database";
import { Applicant } from "../../database/Applicant";
import { User } from "../../database/User";
import { EntityManager } from "typeorm";
import { UserAddress } from "../../database/UserAddress";

export const importApplicant = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }

  const request = ctx.request.body as ImportApplicantRequest[];
  const importErrors: string[] = [];
  const importSuccesses: string[] = [];

  for (const applicantData of request) {
    const applicant = await AppDataSource.getRepository(Applicant).findOne({
      where: {
        user: {
          name: applicantData.name,
        },
      },
      relations: {
        user: true,
        address: true,
      },
    });

    try {
      await AppDataSource.transaction(async (entityManager) => {
        if (!applicant) {
          // applicant does not exist yet -> create
          const user = await entityManager.findOneBy(User, {
            name: applicantData.name,
          });
          if (!user) {
            importErrors.push(
              `User not found: ${applicantData.name} - ignored`,
            );
            return;
          }
          const userAddress = await saveUserAddress(
            new UserAddress(),
            applicantData.data,
            entityManager,
          );

          const newApplicant = new Applicant();
          newApplicant.confirmGDPR = false;
          newApplicant.address = userAddress;
          newApplicant.comment = "imported";
          newApplicant.hash = "";
          newApplicant.active = false;
          newApplicant.user = user;

          entityManager.save(Applicant, newApplicant);
          importSuccesses.push(
            `Created applicant data for ${applicantData.name}`,
          );
        } else {
          // update existing applicant
          const existingAddressData = JSON.parse(
            applicant.address.address,
          ) as Partial<Address>;
          const userAddress = await saveUserAddress(
            applicant.address,
            applicantData.data,
            entityManager,
            existingAddressData,
          );
          applicant.address = userAddress;
          entityManager.save(Applicant, applicant);
          importSuccesses.push(
            `Updated applicant data for ${applicantData.name}`,
          );
        }
      });
    } catch (e) {
      importErrors.push(`Error importing ${applicantData.name} - ${e}`);
    }
  }

  ctx.status = http.ok;
  ctx.body = {
    success: importSuccesses,
    error: importErrors,
  } as ImportApplicantsResponse;
};

const saveUserAddress = async (
  userAddress: UserAddress,
  importedAddressData: Partial<Address>,
  entityManager: EntityManager,
  existingAddressData?: Partial<Address>,
): Promise<UserAddress> => {
  userAddress.active = false;
  const addressData: Address = {
    firstname:
      importedAddressData.firstname || existingAddressData?.firstname || "",
    lastname:
      importedAddressData.lastname || existingAddressData?.lastname || "",
    phone: importedAddressData.phone || existingAddressData?.phone || "",
    email: importedAddressData.email || existingAddressData?.email || "",
    street: importedAddressData.street || existingAddressData?.street || "",
    postalcode:
      importedAddressData.postalcode || existingAddressData?.postalcode || "",
    city: importedAddressData.city || existingAddressData?.city || "",
  };
  userAddress.address = JSON.stringify(addressData);

  return await entityManager.save(UserAddress, userAddress);
};
