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
import { Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { Content } from "pdfmake/interfaces";

const formatReceiver = (profile: CommercialProfile): string => {
  return `${profile.companyName}\n${profile.street}\n${profile.postalcode} ${profile.city}`;
};

const unitPriceLabel = (unit: Unit): string => {
  switch (unit) {
    case Unit.WEIGHT:
      return "€/kg";
    case Unit.PIECE:
      return "€/Stk";
    case Unit.VOLUME:
      return "€/l";
    default:
      return "€";
  }
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
    const product = productsById[item.productId];
    const qtyLabel = `${getSaleQuantityInBigUnits(item).toLocaleString("de-DE")} ${unitPriceLabel(item.unit).replace("€/", "")}`;
    return [
      item.isBio ? "Ja" : "Nein",
      product?.name || "Unbekannt",
      `${item.quantity} ${getLangUnit(item.unit)} (${qtyLabel})`,
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

  const additionalContent: Content[] = [
    {
      text: [
        { text: "Rechnungsnummer: ", bold: true },
        invoice.invoiceNumber,
        "\n",
        { text: "Rechnungsdatum: ", bold: true },
        invoiceDate,
        "\n",
        { text: "Leistungsdatum: ", bold: true },
        deliveryDate,
        "\n",
        { text: "Bio-Kontrollnummer: ", bold: true },
        invoice.bioControlNumber || organizationInfo.bioControlNumber || "—",
      ],
      margin: [0, 0, 0, 16],
    },
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
        "\n\n",
        vatSummaryLines,
        "\n\n",
        organizationInfo.bankAccount,
      ],
      margin: [0, 16, 0, 0],
    },
  ];

  if (footerText) {
    additionalContent.push({
      text: footerText,
      margin: [0, 16, 0, 0],
      fontSize: 10,
    });
  }

  const pdfSpec: PdfSpec = {
    receiver: formatReceiver(customerProfile),
    description: "Rechnung",
    footerTextRight: `Rechnung ${invoice.invoiceNumber}`,
    tables: [
      {
        name: "Positionen",
        headers: [
          "Bio",
          "Bezeichnung",
          "Menge",
          "Einzelpreis",
          "MwSt.",
          "Gesamt",
        ],
        widths: ["8%", "32%", "20%", "14%", "10%", "16%"],
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
