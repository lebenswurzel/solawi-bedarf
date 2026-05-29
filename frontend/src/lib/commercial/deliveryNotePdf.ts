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
  CommercialDeliveryFullInformation,
  CommercialProfile,
  OrganizationInfo,
  ProductsById,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { format } from "date-fns";
import { sanitizeFileName } from "@lebenswurzel/solawi-bedarf-shared/src/util/fileHelper.ts";
import { getLangUnit } from "@lebenswurzel/solawi-bedarf-shared/src/util/unitHelper.ts";
import {
  createDefaultPdf,
  PdfSpec,
} from "@lebenswurzel/solawi-bedarf-shared/src/pdf/pdf.ts";

const formatReceiver = (profile: CommercialProfile): string => {
  return `${profile.companyName}\n${profile.street}\n${profile.postalcode} ${profile.city}`;
};

export function createCommercialDeliveryNotePdf(
  delivery: CommercialDeliveryFullInformation,
  customerProfile: CommercialProfile,
  productsById: ProductsById,
  organizationInfo: OrganizationInfo,
  headerText?: string,
  footerText?: string,
) {
  const prettyDate = format(new Date(delivery.deliveryDate), "dd.MM.yyyy");
  const rows = delivery.items.map((item) => {
    const product = productsById[item.productId];
    const description = item.description || "";
    return [
      `${item.quantity} ${getLangUnit(item.unit)}`,
      `${product?.name || "Unbekannt"}${item.isBio ? " [BIO]" : ""}`,
      description,
    ];
  });

  const pdfSpec: PdfSpec = {
    receiver: formatReceiver(customerProfile),
    description: `Lieferschein für ${prettyDate}${
      delivery.description ? `\n\n${delivery.description}` : ""
    }`,
    headerTextLeft: headerText,
    footerTextLeft: footerText || "",
    footerTextRight: `Lieferschein ${prettyDate}`,
    tables: [
      {
        name: "Lieferung",
        headers: ["Menge", "Bezeichnung", "Bemerkung"],
        widths: ["20%", "45%", "35%"],
        rows,
      },
    ],
  };

  const pdf = createDefaultPdf(pdfSpec, organizationInfo);
  pdf.download(
    `lieferschein-${sanitizeFileName(customerProfile.companyName)}-${format(new Date(delivery.deliveryDate), "yyyy-MM-dd")}.pdf`,
  );
}
