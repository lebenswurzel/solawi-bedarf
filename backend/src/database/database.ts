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
];

const migrations = [
  // InitialSetup1708028123640, //done via sync on initial start
  AddTextContentDepotCapacityOrderAlternateDepot1708028123641,
  Shipment1711181370934,
  OrderValidFrom1711780969019,
];

const configuredPort = config.testing.isTesting
  ? config.testing.dbPort
  : config.db.port;
const port =
  typeof configuredPort === "number"
    ? configuredPort
    : parseInt(configuredPort);

console.log("Connecting to database " + config.db.url + ":" + port);

const dataSourceOptions: PostgresConnectionOptions = {
  type: "postgres",
  host: config.db.url,
  port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.name,
  synchronize: config.testing.isTesting,
  logging: false,
  entities,
  subscribers: [],
  migrations,
  migrationsRun: !config.testing.isTesting,
};

export const AppDataSource = new DataSource(dataSourceOptions);
