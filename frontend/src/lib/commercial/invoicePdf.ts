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
  Invoice,
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
import {
  formatCentsAsEuro,
  getDeliveryTotals,
  getLineGrossCents,
  getSaleQuantityInBigUnits,
} from "@lebenswurzel/solawi-bedarf-shared/src/commercial/pricing.ts";
import { formatCommercialItemBezeichnung } from "@lebenswurzel/solawi-bedarf-shared/src/commercial/itemDisplay.ts";
import { Content } from "pdfmake/interfaces";

const formatReceiver = (profile: CommercialProfile): string => {
  return `${profile.companyName}\n${profile.street}\n${profile.postalcode} ${profile.city}`;
};

export function createCommercialInvoicePdf(
  delivery: CommercialDeliveryFullInformation,
  invoice: Invoice,
  customerProfile: CommercialProfile,
  productsById: ProductsById,
  organizationInfo: OrganizationInfo,
  footerText?: string,
) {
  const deliveryDate = format(new Date(delivery.deliveryDate), "dd.MM.yyyy");
  const invoiceDate = format(new Date(invoice.createdAt), "dd.MM.yyyy");
  const totals = getDeliveryTotals(delivery.items);

  const rows = delivery.items.map((item) => {
    const menge = `${getSaleQuantityInBigUnits(item).toLocaleString("de-DE")} ${getLangUnit(item.unit, true)}`;
    return [
      formatCommercialItemBezeichnung(item, productsById, {
        includeDescription: true,
        includeBioSuffix: true,
      }),
      menge,
      formatCentsAsEuro(item.unitPriceCents),
      `${item.vatRate} %`,
      formatCentsAsEuro(getLineGrossCents(item)),
    ];
  });

  const vatSummaryLines = Object.entries(totals.vatByRate)
    .map(
      ([rate, values]) =>
        `${rate} % MwSt.: Netto ${formatCentsAsEuro(values.netCents)}, MwSt. ${formatCentsAsEuro(values.vatCents)}`,
    )
    .join("\n");

  const additionalContent: Content[] = [];

  if (delivery.description?.trim()) {
    additionalContent.push({
      text: delivery.description.trim(),
      margin: [0, 16, 0, 0],
    });
  }

  additionalContent.push(
    {
      text: [
        { text: "Netto gesamt: ", bold: true },
        formatCentsAsEuro(totals.netCents),
        "\n",
        { text: "MwSt. gesamt: ", bold: true },
        formatCentsAsEuro(totals.vatCents),
        "\n",
        { text: "Brutto gesamt: ", bold: true },
        formatCentsAsEuro(totals.grossCents),
      ],
      alignment: "right",
      margin: [0, 8, 0, 0],
    },
    {
      text: vatSummaryLines,
      margin: [0, 8, 0, 0],
    },
  );

  if (footerText) {
    additionalContent.push({
      text: footerText,
      margin: [0, 16, 0, 0],
      fontSize: 8,
    });
  }

  const bioControlNumber =
    invoice.bioControlNumber || organizationInfo.bioControlNumber || "—";
  const footerLeft = [
    `Bio-Kontrollnummer: ${bioControlNumber}`,
    organizationInfo.bankAccount?.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const pdfSpec: PdfSpec = {
    receiver: formatReceiver(customerProfile),
    description: "Rechnung",
    fontSize: 11,
    footerFontSize: 8,
    pageMarginBottom: 90,
    footerTextLeft: footerLeft,
    headerTextRight: {
      text: [
        { text: "Rechnungsnummer: ", bold: true },
        invoice.invoiceNumber,
        "\n",
        { text: "Rechnungsdatum: ", bold: true },
        invoiceDate,
        "\n",
        { text: "Leistungsdatum: ", bold: true },
        deliveryDate,
      ],
      alignment: "right",
      margin: [0, 12, 0, 0],
    },
    footerTextRight: `Rechnung ${invoice.invoiceNumber}`,
    tables: [
      {
        name: "Positionen",
        headers: [
          "Bezeichnung",
          "Menge",
          "Einzelpreis",
          "MwSt.",
          "Gesamt",
        ],
        widths: ["38%", "18%", "16%", "12%", "16%"],
        rows,
      },
    ],
    additionalContent,
  };

  const pdf = createDefaultPdf(pdfSpec, organizationInfo);
  pdf.download(
    `rechnung-${sanitizeFileName(invoice.invoiceNumber)}-${sanitizeFileName(customerProfile.companyName)}.pdf`,
  );
}
