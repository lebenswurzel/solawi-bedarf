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
import {
  createDefaultPdf,
  PdfSpec,
} from "@lebenswurzel/solawi-bedarf-shared/src/pdf/pdf.ts";
import { getSaleQuantityInBigUnits } from "@lebenswurzel/solawi-bedarf-shared/src/commercial/pricing.ts";
import { formatCommercialItemBezeichnung } from "@lebenswurzel/solawi-bedarf-shared/src/commercial/itemDisplay.ts";
import { Content } from "pdfmake/interfaces";
import {
  commercialDocumentTitle,
  formatCommercialDocumentUnit,
  rightAlignedCell,
} from "./pdfHelpers.ts";

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
  const rows = delivery.items.map((item, index) => {
    return [
      String(index + 1),
      formatCommercialItemBezeichnung(item, productsById, {
        includeBioSuffix: true,
        bioSuffix: ", bio",
      }),
      formatCommercialDocumentUnit(item.unit),
      rightAlignedCell(
        getSaleQuantityInBigUnits(item).toLocaleString("de-DE"),
      ),
      item.description?.trim() || "",
    ];
  });

  const additionalContent: Content[] = [];
  if (delivery.description?.trim()) {
    additionalContent.push({
      text: delivery.description.trim(),
      margin: [0, 16, 0, 0],
    });
  }

  const pdfSpec: PdfSpec = {
    receiver: formatReceiver(customerProfile),
    description: commercialDocumentTitle("Lieferschein"),
    fontSize: 11,
    footerFontSize: 8,
    headerTextLeft: headerText,
    headerTextRight: {
      text: [
        { text: "Lieferdatum: ", bold: true },
        prettyDate,
      ],
      alignment: "right",
      margin: [0, 12, 0, 0],
    },
    footerTextLeft: footerText || "",
    footerTextRight: `Lieferschein ${prettyDate}`,
    tables: [
      {
        name: "Positionen",
        headers: [
          "Pos.",
          "Bezeichnung",
          "Einheit",
          rightAlignedCell("Menge", { bold: true }),
          "Bemerkung",
        ],
        widths: ["8%", "36%", "12%", "12%", "32%"],
        rows,
      },
    ],
    additionalContent,
  };

  const pdf = createDefaultPdf(pdfSpec, organizationInfo);
  pdf.download(
    `lieferschein-${sanitizeFileName(customerProfile.companyName)}-${format(new Date(delivery.deliveryDate), "yyyy-MM-dd")}.pdf`,
  );
}
