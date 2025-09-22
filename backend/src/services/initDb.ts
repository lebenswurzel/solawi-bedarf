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
import { AppDataSource } from "../database/database";
import { User } from "../database/User";
import { config } from "../config";
import { hashPassword } from "../security";
import { TextContent } from "../database/TextContent";
import {
  RequisitionConfig,
  RequisitionConfigName,
} from "../database/RequisitionConfig";
import {
  UserRole,
  TextContentCategory,
  TextContentTyp,
  isMultiContentCategory,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  basicOrganizationInfo,
  emailTextsKeys,
  organizationInfoKeys,
  pageElementKeys,
  pdfTextsDefaults,
  pdfTextsKeys,
} from "@lebenswurzel/solawi-bedarf-shared/src/config";
import { getOrganizationInfoValueByKey } from "@lebenswurzel/solawi-bedarf-shared/src/text/textContent";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang";

export const initDb = async () => {
  const userCount = await AppDataSource.getRepository(User).count();
  if (userCount == 0 && !config.ldap.enabled) {
    const user = new User();
    user.name = config.server.initialUsername;
    user.hash = await hashPassword(config.server.initialPassword);
    user.role = UserRole.ADMIN;
    user.active = true;
    await AppDataSource.getRepository(User).save(user);
  }
  const configCount =
    await AppDataSource.getRepository(RequisitionConfig).count();
  if (configCount == 0) {
    const config = new RequisitionConfig();
    config.name = RequisitionConfigName;
    config.budget = 150000;
    config.startOrder = new Date();
    config.startBiddingRound = new Date();
    config.endBiddingRound = new Date();
    config.validFrom = new Date();
    config.validTo = new Date();
    await AppDataSource.getRepository(RequisitionConfig).save(config);
  }
  await ensureTextContent({
    category: TextContentCategory.IMPRINT,
    title: "Impressum",
    content: "# Impressum",
  });
  await ensureTextContent({
    category: TextContentCategory.PRIVACY_NOTICE,
    title: "Datenschutzerklärung",
    content: "# Datenschutzerklärung",
  });
  await ensureTextContent({
    category: TextContentCategory.MAINTENANCE_MESSAGE,
    title: "Wartungshinweis",
    content: "",
  });

  for (const key of organizationInfoKeys) {
    const content = getOrganizationInfoValueByKey(basicOrganizationInfo, key);
    await ensureTextContent({
      category: TextContentCategory.ORGANIZATION_INFO,
      title: key,
      content,
      typ: TextContentTyp.PLAIN,
    });
  }

  for (const key of pdfTextsKeys) {
    const content = pdfTextsDefaults[key];
    await ensureTextContent({
      category: TextContentCategory.PDF,
      title: key,
      content,
      typ: TextContentTyp.PLAIN,
    });
  }

  const emailTextsDefaults = {
    orderConfirmationFullSeason:
      language.email.orderConfirmation.defaultOrderConfirmationFullSeason.join(
        "\n\n",
      ),
    orderConfirmationChangedOrder:
      language.email.orderConfirmation.defaultOrderConfirmationChangedOrder.join(
        "\n\n",
      ),
  };

  for (const key of emailTextsKeys) {
    const content = emailTextsDefaults[key];
    await ensureTextContent({
      category: TextContentCategory.EMAIL,
      title: key,
      content,
      typ: TextContentTyp.MD,
    });
  }

  for (const key of pageElementKeys) {
    await ensureTextContent({
      category: TextContentCategory.PAGE_ELEMENTS,
      title: key,
      content: "",
      typ: TextContentTyp.MD,
    });
  }
};

const ensureTextContent = async ({
  category,
  title,
  content,
  typ,
}: {
  category: TextContentCategory;
  title: string;
  content: string;
  typ?: TextContentTyp;
}) => {
  let textContentCount = 0;
  if (isMultiContentCategory(category)) {
    textContentCount = await AppDataSource.getRepository(TextContent).count({
      where: { title, category },
    });
  } else {
    textContentCount = await AppDataSource.getRepository(TextContent).count({
      where: { category },
    });
  }

  if (textContentCount > 0) {
    return;
  }
  const textContent = new TextContent();
  textContent.active = true;
  textContent.typ = typ ?? TextContentTyp.MD;
  textContent.title = title;
  textContent.content = content;
  textContent.category = category;
  await AppDataSource.getRepository(TextContent).save(textContent);
};

/*
export const initPerformanceData = async () => {
  const d = new Depot();
  d.name = "Depot";
  d.address = "Hier";
  d.openingHours = "Immer";
  d.active = true;
  await AppDataSource.getRepository(Depot).save(d);

  const products: Product[] = [];
  console.log("Creating Products");
  for (let pcid = 0; pcid < 5; pcid++) {
    const pc = new ProductCategory();
    pc.name = `ProductCategory ${pcid}`;
    pc.active = true;
    await AppDataSource.getRepository(ProductCategory).save(pc);
    for (let pid = 0; pid < 20; pid++) {
      const p = new Product();
      p.name = `Product ${pcid} ${pid}`;
      p.active = true;
      p.productCategory = pc;
      p.frequency = 1;
      p.unit = Unit.PIECE;
      p.quantityMin = 1;
      p.quantityMax = 5;
      p.quantityStep = 1;
      p.quantity = 100;
      p.msrp = 200;
      await AppDataSource.getRepository(Product).save(p);
      products.push(p);
    }
  }
  console.log("Creating Users");
  for (let uid = 0; uid < 200; uid++) {
    const u = new User();
    u.name = `User ${uid}`;
    u.active = true;
    u.role = UserRole.USER;
    u.hash = "not set";
    await AppDataSource.getRepository(User).save(u);
    const o = new Order();
    o.offer = 20;
    o.category = UserCategory.CAT100;
    o.user = u;
    o.depot = d;
    o.productConfiguration = JSON.stringify(
      await AppDataSource.getRepository(ProductCategory).find({
        relations: { products: true },
      }),
    );
    await AppDataSource.getRepository(Order).save(o);
    for (let oid = 0; oid < 100; oid++) {
      const randomIndex = Math.floor(Math.random() * products.length);
      const randomItem = products[randomIndex];
      const oi = new OrderItem();
      oi.value = 2;
      oi.order = o;
      oi.product = randomItem;
      await AppDataSource.getRepository(OrderItem).save(oi);
    }
  }
};
*/
