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
import pdfMake, { createPdf, TCreatedPdf } from "pdfmake/build/pdfmake";
import { pdfFonts } from "../../assets/vfs_fonts";
import {
  Content,
  DynamicContent,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { appConfig } from "../../../../shared/src/config";
import { logo } from "../../../../shared/src/logo";

(<any>pdfMake).vfs = pdfFonts.vfs;

const jsonToTableData = (data: { [key: string]: string | number }[]) => {
  const headers: string[] = [];
  for (let item of data) {
    const itemKeys = Object.keys(item);
    for (let itemKey of itemKeys) {
      if (!headers.includes(itemKey)) {
        headers.push(itemKey);
      }
    }
  }
  const tableData: (string | number)[][] = data
    .map((item) => headers.map((header) => item[header] || ""))
    .sort((row1, row2) => {
      if (typeof row1[0] === "number") {
        return row1[0] - (row2[0] as number);
      } else {
        return row1[0].localeCompare(row2[0] as string);
      }
    });
  return [[...headers], ...tableData];
};

export interface PdfTable {
  name: string;
  headers: string[];
  rows: Content[][];
  widths?: string[];
}

interface PdfDefinition {
  receiver: string;
  description: string;
  footerTextLeft?: string;
  footerTextCenter?: string;
  tables: PdfTable[];
}

export function createDefaultPdf(pdf: PdfDefinition): TCreatedPdf {
  const content: Content[] = [];
  if (logo != null) {
    content.push({
      image: `${logo}`,
      fit: [200, 60],
      alignment: "center",
    });
  }

  content.push({
    table: {
      widths: ["*", "*"],
      body: [
        [
          {
            text: pdf.receiver,
            bold: true,
          },
          {
            text: `${appConfig.address.name}\n${appConfig.address.street}\n${appConfig.address.postalcode} ${appConfig.address.city}`,
            bold: true,
          },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, logo ? 10 : 60, 0, 20],
  });
  content.push({
    text: pdf.description,
  });

  for (const table of pdf.tables) {
    content.push({
      text: table.name,
      margin: [0, 20],
    });

    content.push({
      table: {
        widths: table.widths ?? new Array(table.headers.length).fill("*"),
        headerRows: 1,
        body: [
          table.headers.map((header) => ({
            text: header,
            bold: true,
          })),
          ...table.rows,
        ],
      },
      layout: "light-horizontal-lines",
    });
  }

  const footer: DynamicContent = (currentPage, pageCount): Content => {
    return {
      columns: [
        {
          text: pdf.footerTextLeft || "",
          width: "*",
        },
        {
          text: pdf.footerTextCenter || "",
          alignment: "center",
          width: "auto",
          margin: [10, 0],
        },
        {
          text: `Seite ${currentPage} / ${pageCount}`,
          alignment: "right",
          width: "auto",
        },
      ],
      margin: [30, 0, 30, -30],
    };
  };

  return createPdf({
    content,
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 11,
      },
    },
    footer,
    pageMargins: [30, 60, 30, 40],
  });
}

const createOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string,
): TDocumentDefinitions => {
  const content: Content = [
    {
      text: description,
      margin: [0, 20],
    },
  ];
  const tableData = jsonToTableData(
    Object.entries(data).map(([k, v]) => ({ Bezeichnung: k, ...v })),
  );
  content.push({
    table: {
      widths: ["*", ...new Array(tableData[0].length - 1).fill(40)],
      body: tableData,
    },
    layout: "light-horizontal-lines",
  });
  return {
    pageOrientation: "landscape",
    content: content,
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 11,
      },
    },
  };
};

export const generateOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string,
) => {
  const pdfDefinition = createOverviewPdf(data, description);
  return pdfMake.createPdf(pdfDefinition);
};
