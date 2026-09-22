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
import {
  commercialDocumentTitle,
  formatCommercialDocumentUnit,
  rightAlignedCell,
} from "./pdfHelpers.ts";

const VAT_FOOTNOTE_MARKER: Record<number, string> = {
  7: "A",
  19: "B",
};

const VAT_FOOTNOTE_LEGEND: Record<number, string> = {
  7: "A) 7 % MwSt",
  19: "B) 19 % MwSt",
};

const formatReceiver = (profile: CommercialProfile): string => {
  return `${profile.companyName}\n${profile.street}\n${profile.postalcode} ${profile.city}`;
};

const appendVatFootnote = (label: string, vatRate: number): Content => {
  const marker = VAT_FOOTNOTE_MARKER[vatRate];
  if (!marker) {
    return label;
  }
  return {
    text: [{ text: label }, { text: marker, sup: true }],
  };
};

export function createCommercialInvoicePdf(
  delivery: CommercialDeliveryFullInformation,
  invoice: Invoice,
  customerProfile: CommercialProfile,
  productsById: ProductsById,
  organizationInfo: OrganizationInfo,
  footerText?: string,
  logo?: string | null,
) {
  const deliveryDate = format(new Date(delivery.deliveryDate), "dd.MM.yyyy");
  const invoiceDate = format(new Date(invoice.createdAt), "dd.MM.yyyy");
  const totals = getDeliveryTotals(delivery.items);

  const usedVatRates = [
    ...new Set(delivery.items.map((item) => item.vatRate)),
  ].sort((a, b) => a - b);

  const rows = delivery.items.map((item, index) => {
    return [
      String(index + 1),
      appendVatFootnote(
        formatCommercialItemBezeichnung(item, productsById, {
          includeDescription: true,
          includeBioSuffix: true,
          bioSuffix: ", bio",
        }),
        item.vatRate,
      ),
      rightAlignedCell(formatCentsAsEuro(item.unitPriceCents)),
      formatCommercialDocumentUnit(item.unit),
      rightAlignedCell(getSaleQuantityInBigUnits(item).toLocaleString("de-DE")),
      rightAlignedCell(formatCentsAsEuro(getLineGrossCents(item))),
    ];
  });

  const vatSummaryLines = Object.entries(totals.vatByRate)
    .map(
      ([rate, values]) =>
        `${rate} % MwSt.: Netto ${formatCentsAsEuro(values.netCents)}, MwSt. ${formatCentsAsEuro(values.vatCents)}`,
    )
    .join("\n");

  const vatFootnoteLegend = usedVatRates
    .map((rate) => VAT_FOOTNOTE_LEGEND[rate])
    .filter(Boolean)
    .join("\n");

  const additionalContent: Content[] = [];

  if (vatFootnoteLegend) {
    additionalContent.push({
      text: vatFootnoteLegend,
      fontSize: 9,
      margin: [0, 8, 0, 0],
    });
  }

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
      ],
      alignment: "right",
      margin: [0, 8, 0, 0],
    },
    {
      text: [
        { text: "Rechnungsbetrag: ", bold: true },
        { text: formatCentsAsEuro(totals.grossCents), bold: true },
      ],
      alignment: "right",
      bold: true,
      fontSize: 12,
      margin: [0, 10, 0, 0],
    },
    {
      text: vatSummaryLines,
      margin: [0, 8, 0, 0],
    },
  );

  const bioControlNumber =
    invoice.bioControlNumber || organizationInfo.bioControlNumber || "—";
  const accountInfo = [
    `Bio-Kontrollnummer: ${bioControlNumber}`,
    organizationInfo.bankAccount?.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  if (accountInfo) {
    additionalContent.push({
      text: accountInfo,
      margin: [0, 16, 0, 0],
    });
  }

  const pdfSpec: PdfSpec = {
    receiver: formatReceiver(customerProfile),
    description: commercialDocumentTitle("Rechnung"),
    fontSize: 11,
    tableHeaderFontSize: 9,
    footerFontSize: 8,
    pageMarginBottom: 90,
    footerTextLeft: footerText?.trim() || "",
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
          "Pos.",
          "Bezeichnung",
          rightAlignedCell("Betrag", { bold: true }),
          "Einheit",
          rightAlignedCell("Menge", { bold: true }),
          rightAlignedCell("Gesamtbetrag", { bold: true }),
        ],
        widths: ["6%", "45%", "14%", "12%", "9%", "14%"],
        rows,
      },
    ],
    additionalContent,
  };

  const pdf = createDefaultPdf(pdfSpec, organizationInfo, logo);
  pdf.download(
    `rechnung-${sanitizeFileName(invoice.invoiceNumber)}-${sanitizeFileName(customerProfile.companyName)}.pdf`,
  );
}
