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
import { DataSource, Repository } from "typeorm";
import { UserRepo } from "../services/user/repo";
import { User } from "../database/User";
import { TextContentRepo } from "../services/text/repo";
import { OrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { TextContent } from "../database/TextContent";
import { TextContentCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { makeOrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/text/textContent";
import { PasswordReset } from "../database/PasswordReset";

export class TypeormUserRepo implements UserRepo {
  private repo: Repository<User>;
  private db: DataSource;

  constructor(db: DataSource) {
    this.db = db;
    this.repo = db.getRepository(User);
  }

  async findUserByName(name: string): Promise<User | null> {
    return await this.repo.findOneBy({ name });
  }

  async saveUser(user: User): Promise<void> {
    await this.repo.save(user);
  }

  async findUserByPasswordResetToken(token: string): Promise<User | null> {
    const reset = await this.db
      .getRepository(PasswordReset)
      .findOneBy({ token });
    return reset ? reset.user : null;
  }
}

export class TypeormTextContentRepo implements TextContentRepo {
  private repo: Repository<TextContent>;

  constructor(db: DataSource) {
    this.repo = db.getRepository(TextContent);
  }

  async getOrganizationInfo(): Promise<OrganizationInfo> {
    return makeOrganizationInfo(
      await this.repo.find({
        where: { category: TextContentCategory.ORGANIZATION_INFO },
      }),
    );
  }
}
