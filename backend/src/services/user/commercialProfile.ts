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
import { AppDataSource } from "../../database/database";
import { CommercialProfile } from "../../database/CommercialProfile";
import { User } from "../../database/User";
import { CommercialProfile as CommercialProfileType } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const validateCommercialProfile = (
  profile: CommercialProfileType | null | undefined,
): profile is CommercialProfileType => {
  if (!profile) {
    return false;
  }
  return (
    profile.companyName.trim().length > 0 &&
    profile.street.trim().length > 0 &&
    profile.postalcode.trim().length > 0 &&
    profile.city.trim().length > 0
  );
};

export const saveCommercialProfileForUser = async (
  user: User,
  profile: CommercialProfileType | null | undefined,
) => {
  const repo = AppDataSource.getRepository(CommercialProfile);
  if (user.role === UserRole.COMMERCIAL) {
    if (!validateCommercialProfile(profile)) {
      throw new Error(
        "Gewerbliche Nutzer benötigen ein vollständiges Firmenprofil",
      );
    }
    const existing = await repo.findOneBy({ userId: user.id });
    if (existing) {
      existing.companyName = profile.companyName.trim();
      existing.street = profile.street.trim();
      existing.postalcode = profile.postalcode.trim();
      existing.city = profile.city.trim();
      await repo.save(existing);
    } else {
      const commercialProfile = new CommercialProfile();
      commercialProfile.userId = user.id;
      commercialProfile.user = user;
      commercialProfile.companyName = profile.companyName.trim();
      commercialProfile.street = profile.street.trim();
      commercialProfile.postalcode = profile.postalcode.trim();
      commercialProfile.city = profile.city.trim();
      await repo.save(commercialProfile);
    }
  } else {
    await repo.delete({ userId: user.id });
  }
};

export const getCommercialProfileByUserId = async (
  userId: number,
): Promise<CommercialProfileType | null> => {
  const profile = await AppDataSource.getRepository(
    CommercialProfile,
  ).findOneBy({ userId });
  if (!profile) {
    return null;
  }
  return {
    companyName: profile.companyName,
    street: profile.street,
    postalcode: profile.postalcode,
    city: profile.city,
  };
};
