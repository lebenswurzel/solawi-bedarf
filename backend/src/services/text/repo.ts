import { OrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/types";

export interface TextContentRepo {
  getOrganizationInfo(): Promise<OrganizationInfo>;
}
