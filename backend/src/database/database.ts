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
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { User } from "./User";
import { config } from "../config";
import { Token } from "./Token";
import { ProductCategory } from "./ProductCategory";
import { Product } from "./Product";
import { Order } from "./Order";
import { Depot } from "./Depot";
import { OrderItem } from "./OrderItem";
import { Applicant } from "./Applicant";
import { UserAddress } from "./UserAddress";
import { TextContent } from "./TextContent";
import { InitialSetup1708028123640 } from "../migrations/1708028123640-initial-setup";
import { AddTextContentDepotCapacityOrderAlternateDepot1708028123641 } from "../migrations/1708028123641-add-textContent-depot-capacity-order-alternateDepot";
import { RequisitionConfig } from "./RequisitionConfig";
import { Shipment } from "./Shipment";
import { ShipmentItem } from "./ShipmentItem";
import { AdditionalShipmentItem } from "./AdditionalShipmentItem";
import { Shipment1711181370934 } from "../migrations/1711181370934-shipment";
import { OrderValidFrom1711780969019 } from "../migrations/1711780969019-order-valid-from";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { DepotRank1726862542988 } from "../migrations/1726862542988-depot-rank";
import { MultiSeason1727640942892 } from "../migrations/1727640942892-multi-season";
import { MultiSeasonForShipmentAndOrder1727966567905 } from "../migrations/1727966567905-multi-season-for-shipment-and-order";
import { NonUniqueProductNames1728134733135 } from "../migrations/1728134733135-non-unique-product-names";
import { ConfigPublicFlag1728677345133 } from "../migrations/1728677345133-config-public-flag";
import { AddMaintenanceMsgText1730887882789 } from "../migrations/1730887882789-add-maintenance-msg-text";
import { AddProductCategoryType1731067417340 } from "../migrations/1731067417340-add-product-category-type";
import { OrganizationInfoTextContent1738274522237 } from "../migrations/1738274522237-organization-info-text-content";
import { PdfTextContent1738317876884 } from "../migrations/1738317876884-pdf-text-content";
import { ErrorLog } from "./ErrorLog";
import { ErrorLog1743622159714 } from "../migrations/1743622159714-error-log";
import { ShipmentRevisions1744143625480 } from "../migrations/1744143625480-shipment-revisions";
import { ShipmentType1747483622562 } from "../migrations/1747483622562-shipment-type";
import { ShipmentValidTo1747515818493 } from "../migrations/1747515818493-shipment-valid-to";
import { AddOrderValidTo1755284922330 } from "../migrations/1755284922330-add-order-valid-to";
import { OrderConfirm1756065235682 } from "../migrations/1756065235682-order-confirm";
import { EmailTexts1757146546682 } from "../migrations/1757146546682-email-texts";
import { PageElementTexts1758569141622 } from "../migrations/1758569141622-page-element-texts";
import { OrderNonNullValidRange1758647660837 } from "../migrations/1758647660837-order-non-null-valid-range";
import { UserDeletedFlag1762292718642 } from "../migrations/1762292718642-user-deleted-flag";
import { OrderItemAvailability1763546749274 } from "../migrations/1763546749274-order-item-availability";

const entities = [
  User,
  Order,
  Token,
  Product,
  ProductCategory,
  Depot,
  OrderItem,
  Applicant,
  UserAddress,
  TextContent,
  RequisitionConfig,
  Shipment,
  ShipmentItem,
  AdditionalShipmentItem,
  ErrorLog,
];

// Run the following SQL once if the InitialSetup migration is not in the migrations table
// but the database schema is already up to date.
// INSERT INTO public.migrations ("timestamp",name) VALUES (1708028123640,'InitialSetup1708028123640');

const migrations = [
  InitialSetup1708028123640, //done via sync on initial start
  AddTextContentDepotCapacityOrderAlternateDepot1708028123641,
  Shipment1711181370934,
  OrderValidFrom1711780969019,
  DepotRank1726862542988,
  MultiSeason1727640942892,
  MultiSeasonForShipmentAndOrder1727966567905,
  NonUniqueProductNames1728134733135,
  ConfigPublicFlag1728677345133,
  AddMaintenanceMsgText1730887882789,
  AddProductCategoryType1731067417340,
  OrganizationInfoTextContent1738274522237,
  PdfTextContent1738317876884,
  ErrorLog1743622159714,
  ShipmentRevisions1744143625480,
  ShipmentType1747483622562,
  ShipmentValidTo1747515818493,
  AddOrderValidTo1755284922330,
  OrderConfirm1756065235682,
  EmailTexts1757146546682,
  PageElementTexts1758569141622,
  OrderNonNullValidRange1758647660837,
  UserDeletedFlag1762292718642,
  OrderItemAvailability1763546749274,
];

const configuredPort = config.testing.isTesting
  ? config.testing.dbPort
  : config.db.port;
const port =
  typeof configuredPort === "number"
    ? configuredPort
    : parseInt(configuredPort);

const syncronize = config.testing.isTesting;

console.log(
  `Connecting to database ${config.db.url}:${port} (syncronize=${syncronize})`,
);

const dataSourceOptions: PostgresConnectionOptions = {
  type: "postgres",
  host: config.db.url,
  port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.name,
  synchronize: syncronize,
  logging: false,
  entities,
  subscribers: [],
  migrations,
  migrationsRun: !syncronize,
  extra: {
    options: "-c timezone=UTC",
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
