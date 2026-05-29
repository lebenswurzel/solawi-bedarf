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
import { CommercialDelivery } from "../../database/CommercialDelivery";
import { CommercialDeliveryFullInformation } from "@lebenswurzel/solawi-bedarf-shared/src/types";

export const mapCommercialDelivery = (
  delivery: CommercialDelivery,
): CommercialDeliveryFullInformation => {
  return {
    id: delivery.id,
    deliveryDate: delivery.deliveryDate,
    customerUserId: delivery.customerUserId,
    description: delivery.description,
    active: delivery.active,
    updatedAt: delivery.updatedAt,
    customerName: delivery.customer?.name,
    companyName: delivery.customer?.commercialProfile?.companyName,
    items: (delivery.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      conversionFrom: item.conversionFrom,
      conversionTo: item.conversionTo,
      unitPriceCents: item.unitPriceCents,
      vatRate: item.vatRate,
      isBio: item.isBio,
      description: item.description,
    })),
    invoice: delivery.invoice
      ? {
          invoiceNumber: delivery.invoice.invoiceNumber,
          bioControlNumber: delivery.invoice.bioControlNumber,
          createdAt: delivery.invoice.createdAt,
        }
      : null,
  };
};
