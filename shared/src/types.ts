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
import {
  ProductCategoryType,
  TextContentCategory,
  TextContentTyp,
  Unit,
  UserCategory,
  UserRole,
} from "./enum";

export interface OptionalId {
  id?: number;
}

export type Id = Required<OptionalId>;

export interface NewUser {
  name?: string;
  role: UserRole;
  active: boolean;
}

export type User = Required<NewUser> & Id;

export type SaveUserRequest = Required<NewUser> &
  OptionalId & {
    password?: string;
    orderValidFrom: Date | null;
    requisitionConfigId: number;
  };

export type LastOrderChange = {
  date: Date;
  configId: number;
};

export type UserWithLastOrderChange = Required<User> & {
  lastOrderChanges: LastOrderChange[];
  emailEnabled: boolean;
};
export type GetUserResponse = {
  userId: number;
  users: UserWithLastOrderChange[];
};

export type UpdateUserRequest = Id & {
  active?: boolean;
};

export interface NewProduct {
  description?: string | null;
  name?: string;
  active: boolean;
  msrp?: number;
  frequency?: number;
  quantity?: number;
  quantityMin?: number;
  quantityMax?: number;
  quantityStep?: number;
  unit?: Unit;
  productCategoryId?: number;
}

export type Product = Required<NewProduct> & Id;

export type ProductWithProductCategoryTyp = Required<NewProduct> &
  Id & {
    productCategoryType: ProductCategoryType;
  };

export type ProductsById = {
  [key: number]: ProductWithProductCategoryTyp;
};

export interface NewProductCategory {
  name?: string;
  active: boolean;
  requisitionConfigId: number;
  typ: ProductCategoryType;
}

export type ProductCategory = Required<NewProductCategory> & Id;

export type ProductCategoryWithProducts = ProductCategory & {
  products: Product[];
};

export interface OrderItem {
  productId: number;
  value: number;
}

export interface Order {
  orderItems: OrderItem[];
  depotId: number;
  alternateDepotId: number | null;
  offer: number;
  offerReason: string | null;
  category: UserCategory;
  categoryReason: string | null;
  validFrom: Date | null;
  requisitionConfigId: number;
}

export interface ConfirmedOrder extends Order {
  confirmGTC: boolean;
  sendConfirmationEmail?: boolean;
}

export interface Address {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  street: string;
  postalcode: string;
  city: string;
}

export interface Applicant {
  id?: number;
  confirmGDPR: boolean;
  password?: string;
  comment: string;
  name?: string;
  address: Address;
  createdAt?: string;
}

export interface NewDepot {
  name?: string;
  address?: string;
  openingHours?: string;
  comment: string | null;
  capacity: number | null;
  active: boolean;
}

export interface RankedDepot {
  rank: number;
}

export type Depot = Required<NewDepot> & Id & RankedDepot;

export interface UpdateDepot extends Id {
  rankUp: boolean;
  rankDown: boolean;
}

export interface SimpleTextContent {
  title: string;
  content: string;
}

export interface NewTextContent extends SimpleTextContent {
  category: TextContentCategory;
  typ: TextContentTyp;
}

export type TextContent = NewTextContent & Id;
export type SaveTextContentRequest = NewTextContent & OptionalId;

export function isIdType(entity: any): entity is Id {
  return entity.id !== undefined;
}

interface RequisitionConfig {
  name: string;
  startOrder: Date;
  startBiddingRound: Date;
  endBiddingRound: Date;
  budget: number;
  validFrom: Date;
  validTo: Date;
  public: boolean;
}

export type ExistingConfig = RequisitionConfig & Id;
export type NewConfig = RequisitionConfig;

export interface AvailableConfig {
  id: number;
  name: string;
  public: boolean;
}

export interface CreateConfigRequest {
  config: NewConfig;
  copyFrom: number | undefined;
}

export interface ConfigResponse {
  depots: Depot[];
  config: RequisitionConfig & Id;
  availableConfigs: AvailableConfig[];
  showSeasonSelectorHint: boolean;
}

export type SoldByProductId = {
  [key: number]: {
    sold: number;
    quantity: number;
    frequency: number;
    soldForShipment: number;
  };
};

export type CapacityByDepotId = {
  [key: number]: {
    capacity: number | null;
    reserved: number;
    userIds: number[];
  };
};

export type DeliveredByProductIdDepotId = {
  [key: number]: {
    [key: number]: {
      value: number;
      delivered: number;
      actuallyDelivered: number;
      frequency: number;
      valueForShipment: number;
    };
  };
};

export interface BaseShipmentItem {
  depotId: number;
  totalShipedQuantity: number; // delivered quantity
  unit: Unit; // delivered unit
  isBio: boolean;
}

export interface ShipmentItem extends BaseShipmentItem {
  productId: number;
  description: string | null;
  multiplicator: number;
  conversionFrom: number; // in requested units
  conversionTo: number; // in delivered units
}

export interface EditShipmentItem
  extends Omit<ShipmentItem, "depotId" | "productId" | "unit"> {
  productId?: number;
  depotIds: number[];
  unit?: Unit;
  showItem: boolean;
}

export interface AdditionalShipmentItem extends BaseShipmentItem {
  product: string;
  quantity: number; // quantity per user in delivered units
  description: string | null;
}

export interface EditAdditionalShipmentItem
  extends Omit<AdditionalShipmentItem, "depotId" | "product" | "unit"> {
  depotIds: number[];
  product?: string;
  unit?: Unit;
  showItem: boolean;
}

export interface Shipment {
  description: string | null;
  validFrom: Date;
  shipmentItems: ShipmentItem[];
  additionalShipmentItems: AdditionalShipmentItem[];
  active: boolean;
  updatedAt?: Date;
  requisitionConfigId: number;
}

export interface EditShipment
  extends Omit<Shipment, "id" | "shipmentItems" | "additionalShipmentItems"> {
  shipmentItems: EditShipmentItem[];
  additionalShipmentItems: EditAdditionalShipmentItem[];
}

export interface BuildInfo {
  buildDate: string;
  git: {
    hash: string;
    hashShort: string;
    branch: string;
    tag: string;
    commitDate: string;
  };
  maintenance?: {
    enabled?: boolean;
    message?: string;
  };
}

export interface VersionInfo {
  buildInfo: BuildInfo;
}

export interface OrderOverviewItem {
  name: string;
  depot: string;
  alternateDepot?: string;
  msrp: number;
  offer: number;
  offerReason: string;
  category: UserCategory;
  categoryReason: string;
  items: {
    name: string;
    value: number;
    unit: Unit;
    category: number;
  }[];
}

export interface Msrp {
  total: number;
  selfgrown: number;
  cooperation: number;
}

export interface OrganizationInfo {
  appUrl: string;
  address: {
    name: string;
    street: string;
    postalcode: string;
    city: string;
    email: string;
    forumContact: string;
  };
}

type FlattenKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]:
        | `${Prefix}${K & string}`
        | FlattenKeys<T[K], `${Prefix}${K & string}.`>;
    }[keyof T]
  : never;

export type OrganizationInfoKeys = FlattenKeys<OrganizationInfo>;

export interface PdfTexts {
  packagingListFooter: string;
  packagingListHeader: string;
}
export type PdfTextsKeys = FlattenKeys<PdfTexts>;
