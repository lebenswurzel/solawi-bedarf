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
import { TextContentCategory, Unit, UserCategory, UserRole } from "./enum";

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

export type ProductsById = {
  [key: number]: Product;
};

export interface NewProductCategory {
  name?: string;
  active: boolean;
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
}

export interface ConfirmedOrder extends Order {
  confirmGTC: boolean;
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

export interface NewTextContent {
  title: string;
  category: TextContentCategory;
  content: string;
}

export type TextContent = NewTextContent & Id;

export function isIdType(entity: any): entity is Id {
  return entity.id !== undefined;
}

export interface RequisitionConfig {
  id?: number
  name: string;
  startOrder: Date;
  startBiddingRound: Date;
  endBiddingRound: Date;
  budget: number;
  validFrom: Date;
  validTo: Date;
}

export interface ConfigResponse {
  depots: Depot[]
  config: RequisitionConfig
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
}

export interface EditShipment
  extends Omit<Shipment, "id" | "shipmentItems" | "additionalShipmentItems"> {
  shipmentItems: EditShipmentItem[];
  additionalShipmentItems: EditAdditionalShipmentItem[];
}
