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
