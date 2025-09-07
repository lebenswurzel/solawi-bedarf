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
/**
 * Dependency injection middleware.
 */
import Koa from "koa";
import { EmailService } from "../ports/email";
import { NodemailerEmailService } from "../services/email/email";
import { UserRepo } from "../services/user/repo";
import { TypeormTextContentRepo, TypeormUserRepo } from "../adapter/typeorm";
import { AppDataSource } from "../database/database";
import { TextContentRepo } from "../services/text/repo";

export interface DependenciesContext {
  deps: AppDependencies;
}

export function useDependencies<S, T extends DependenciesContext>(
  app: Koa<S, T>,
) {
  app.context.deps = new AppDependencies();
}

const emailService = new NodemailerEmailService();
const userRepo = new TypeormUserRepo(AppDataSource);
const textContentRepo = new TypeormTextContentRepo(AppDataSource);

export class AppDependencies
  implements EmailService, UserRepo, TextContentRepo
{
  sendEmail = emailService.sendEmail;
  saveUser = userRepo.saveUser;
  findUserByName = userRepo.findUserByName;
  findUserByPasswordResetToken = userRepo.findUserByPasswordResetToken;
  getOrganizationInfo = textContentRepo.getOrganizationInfo;
}
