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
import { TextContentCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { makeOrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/text/textContent";
import { OrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { AppDataSource } from "../../database/database";
import { TextContent } from "../../database/TextContent";

export const getOrganizationInfo = async (): Promise<OrganizationInfo> => {
  const textContent = await AppDataSource.getRepository(TextContent).find({
    where: { category: TextContentCategory.ORGANIZATION_INFO },
  });
  return makeOrganizationInfo(textContent);
};
