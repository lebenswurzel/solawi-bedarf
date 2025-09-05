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
  ShipmentType,
  TextContentCategory,
  TextContentTyp,
  Unit,
  UserCategory,
  UserRole,
} from "./enum";

export type DateString = string;
export type UserId = number;
export type ProductId = number;
export type DepotId = number;
export type OrderId = number;

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

export type SaveUserRequest = Required<NewUser> & {
  id?: UserId;
  password?: string;
  orderValidFrom: Date | null;
  requisitionConfigId: number;
};

export type UserOrder = {
  updatedAt: Date;
  configId: number;
  validFrom: Date | null;
  hasItems: boolean;
  depotId: number;
  depotName: string;
};

export type UserWithOrders = Required<User> & {
  orders: UserOrder[];
  emailEnabled: boolean;
};
export type GetUserResponse = {
  userId: UserId;
  users: UserWithOrders[];
  tokenValidUntil: Date | null;
};

export type UpdateUserRequest = Id & {
  active?: boolean;
  orderValidFrom?: Date;
  addNewOrder?: boolean;
  configId: number;
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

export type Product = Required<NewProduct> & { id: ProductId };

export type ProductWithProductCategoryTyp = Required<NewProduct> & {
  id: ProductId;
  productCategoryType: ProductCategoryType;
};

export type ProductsById = {
  [key: ProductId]: ProductWithProductCategoryTyp;
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
  productId: ProductId;
  value: number;
}

export interface Order {
  orderItems: OrderItem[];
  depotId: DepotId;
  alternateDepotId: DepotId | null;
  offer: number;
  offerReason: string | null;
  category: UserCategory;
  categoryReason: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  requisitionConfigId: number;
  confirmGTC: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SavedOrder extends Order {
  id: OrderId;
  userId?: UserId;
}

export interface SavedOrderWithPredecessor extends SavedOrder {
  predecessorId: OrderId | null;
}

export interface ConfirmedOrder extends Order {
  sendConfirmationEmail?: boolean;
  confirmSepaUpdate: boolean;
  confirmBankTransfer: boolean;
  id?: OrderId;
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

export interface ApplicantExport extends Address {
  comment: string;
}

export interface ImportApplicantRequest {
  name: string;
  data: Partial<Address>;
}

export interface ImportApplicantsResponse {
  success: string[];
  error: string[];
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

export interface RequisitionConfig {
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
  [key: ProductId]: {
    sold: number; // amount sold based on all the orders (even those with validFrom in the future) (in pcs, g, ml)
    quantity: number; // almost the same as product.quantity but in pcs, g, ml (where product.quantity is in pcs, kg, l)
    frequency: number; // same as product.frequency
    soldForShipment: number; // amount sold based on the orders with validFrom in the past (in pcs, g, ml)
  };
};

export type CapacityByDepotId = {
  [key: DepotId]: {
    capacity: number | null;
    reserved: number;
    userIds: UserId[];
  };
};

export type DeliveredByProductIdDepotId = {
  [key: ProductId]: {
    [key: DepotId]: {
      value: number; // amount required per shipment based on all the orders (even those with validFrom in the future) (in pcs, g, ml)
      valueForShipment: number; // amount required per shipment based on the orders with validFrom in the past (in pcs, g, ml)
      actuallyDelivered: number; // amount contained in active shipments (in pcs, g, ml)
      frequency: number; // same as product.frequency
      deliveryCount: number; // number of deliveries to this depot
    };
  };
};

export interface BaseShipmentItem {
  depotId: DepotId;
  totalShipedQuantity: number; // delivered quantity
  unit: Unit; // delivered unit
  isBio: boolean;
}

export interface ShipmentItem extends BaseShipmentItem {
  productId: ProductId;
  description: string | null;
  multiplicator: number;
  conversionFrom: number; // in requested units
  conversionTo: number; // in delivered units
}

export interface EditShipmentItem
  extends Omit<ShipmentItem, "depotId" | "productId" | "unit"> {
  productId?: ProductId;
  depotIds: DepotId[];
  unit?: Unit;
  showItem: boolean;
  isNew?: boolean;
}

export interface AdditionalShipmentItem extends BaseShipmentItem {
  product: string;
  quantity: number; // quantity per user in delivered units
  description: string | null;
}

export interface EditAdditionalShipmentItem
  extends Omit<AdditionalShipmentItem, "depotId" | "product" | "unit"> {
  depotIds: DepotId[];
  product?: string;
  unit?: Unit;
  showItem: boolean;
}

export interface ShipmentMainInformation {
  description: string | null;
  validFrom: Date | string;
  validTo?: Date | string;
  active: boolean;
  updatedAt?: Date | string;
  requisitionConfigId: number;
  type: ShipmentType;
}

export interface Shipment extends ShipmentMainInformation {
  shipmentItems: ShipmentItem[];
  additionalShipmentItems: AdditionalShipmentItem[];
}
export interface ShipmentRequest extends Shipment {
  revisionMessage?: string;
}

export interface ShipmentWithRevisionMessages extends ShipmentMainInformation {
  id: number;
  revisionMessages: RevisionMessageJson[];
}

export interface ShipmentFullInformation extends Shipment {
  id: number;
  revisionMessages: RevisionMessageJson[];
}

export interface EditShipment
  extends Omit<Shipment, "id" | "shipmentItems" | "additionalShipmentItems"> {
  shipmentItems: EditShipmentItem[];
  additionalShipmentItems: EditAdditionalShipmentItem[];
}

export interface RevisionMessageJson {
  message: string;
  createdAt: DateString;
  userName: string;
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
  serverTimeZone: string;
}

export interface OrderOverviewProductItem {
  name: string;
  value: number;
  unit: Unit;
  category: number;
}

export interface OrderOverviewItem {
  name: string;
  identifier: string;
  depot: string;
  alternateDepot?: string;
  msrp: number;
  months: number;
  startMonth: string | null;
  offer: number;
  offerReason: string;
  category: UserCategory;
  categoryReason: string;
  seasonName: string;
  items: OrderOverviewProductItem[];
}

export interface OrderOverviewApplicant {
  realName: string;
  email: string;
  phone: string;
  street: string;
  postalcode: string;
  city: string;
}

export type OrderOverviewWithApplicantItem = OrderOverviewItem &
  OrderOverviewApplicant;

export interface Msrp {
  monthly: {
    total: number;
    selfgrown: number;
    cooperation: number;
    selfgrownCompensation: number | undefined;
  };
  yearly: {
    total: number;
    selfgrown: number;
    cooperation: number;
    selfgrownCompensation: number | undefined;
  };
  months: number;
  contribution: UserCategory;
}

export interface OrganizationInfo {
  appUrl: string;
  name: string;
  address: {
    name: string;
    street: string;
    postalcode: string;
    city: string;
    email: string;
    forumContact: string;
  };
  bankAccount: string;
}

type FlattenKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]:
        | `${Prefix}${K & string}`
        | FlattenKeys<T[K], `${Prefix}${K & string}.`>;
    }[keyof T]
  : never;

export type OrganizationInfoKeys = FlattenKeys<OrganizationInfo>;

export type OrganizationInfoFlatKeys =
  | "organization.appUrl"
  | "organization.name"
  | "organization.address.name"
  | "organization.address.street"
  | "organization.address.postalcode"
  | "organization.address.city"
  | "organization.address.email"
  | "organization.address.forumContact"
  | "organization.bankAccount";

export type OrganizationInfoFlat = Record<OrganizationInfoFlatKeys, string>;

export interface PdfTexts {
  packagingListFooter: string;
  packagingListHeader: string;
}
export type PdfTextsKeys = FlattenKeys<PdfTexts>;

export interface ErrorLogEntry {
  id: number;
  createdAt: Date;
  method: string;
  url: string;
  status: number;
  error: {
    name?: string;
    message: string;
    stack?: string[];
  };
  requestBody?: any;
  requestQuery?: any;
  requestHeaders?: any;
  userAgent?: string;
  ip?: string;
  userId?: UserId;
  userName?: string;
}

export type GetErrorLogResponse = ErrorLogEntry[];

export interface BIData {
  soldByProductId: SoldByProductId;
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId;
  capacityByDepotId: CapacityByDepotId;
  productsById: ProductsById;
  offers: number;
}
