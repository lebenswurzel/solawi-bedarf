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
import { pdfFonts } from "../assets/vfs_fonts";
import {
  Content,
  DynamicContent,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { logo } from "../logo";
import { OrganizationInfo } from "../types";
import { format } from "date-fns";

(<any>pdfMake).vfs = pdfFonts.vfs;

export type HeaderSortKeys = { [key: string]: number };

const jsonToTableData = (
  data: { [key: string]: string | number }[],
  headerSortKeys?: HeaderSortKeys
) => {
  let headers: string[] = [];
  for (let item of data) {
    const itemKeys = Object.keys(item); // depot keys
    for (let itemKey of itemKeys) {
      if (!headers.includes(itemKey)) {
        headers.push(itemKey);
      }
    }
  }

  if (headerSortKeys) {
    headers = headers.sort((h1, h2) => {
      return (headerSortKeys[h1] ?? 0) - (headerSortKeys[h2] ?? 0);
    });
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

export interface PdfSpec {
  receiver: string;
  description: string;
  footerTextLeft?: string;
  footerTextRight?: string;
  headerTextLeft?: string;
  tables: PdfTable[];
}

export function createDefaultPdf(
  pdf: PdfSpec,
  organizationInfo: OrganizationInfo
): TCreatedPdf {
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
            text: `${organizationInfo.address.name}\n${organizationInfo.address.street}\n${organizationInfo.address.postalcode} ${organizationInfo.address.city}`,
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
          table.headers.map((header, index) => ({
            text: header,
            bold: true,
            fontSize: index == 0 ? 10 : undefined,
          })),
          ...table.rows.map((row) =>
            row.map((cell, index) => {
              if (index == 0) {
                return {
                  text: cell,
                  color: "#777",
                };
              }
              if (index == 2) {
                return {
                  text: cell,
                  fontSize: 10,
                };
              }
              return cell;
            })
          ),
        ],
      },
      layout: "lightHorizontalLines",
    });
  }

  const creationDate = format(new Date(), "dd.MM.yyyy, HH:mm:ss");

  const footerTextLeft = pdf.footerTextLeft || "";

  const footer: DynamicContent = (currentPage, pageCount): Content => {
    return {
      columns: [
        {
          text: footerTextLeft.includes("\n")
            ? footerTextLeft
            : `\n${footerTextLeft}`,
          width: "*",
          fontSize: 10,
        },
        {
          text: `\nSeite ${currentPage} / ${pageCount}`,
          alignment: "center",
          width: "auto",
          fontSize: 10,
        },
        {
          text: (pdf.footerTextRight || "") + `\nErstellt am ${creationDate}`,
          alignment: "right",
          width: "*",
          margin: [10, 0],
          fontSize: 10,
        },
      ],
      margin: [40, 5, 40, -20],
    };
  };

  let header: DynamicContent | undefined = undefined;
  if (pdf.headerTextLeft) {
    header = (): Content => {
      return [
        {
          text: pdf.headerTextLeft ?? "",
          fontSize: 10,
          margin: [40, 30, 40, 5],
        },
      ];
    };
  }

  return createPdf({
    content,
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 11,
      },
    },
    header,
    footer,
    pageMargins: [40, 60, 40, 60],
  });
}

const createOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string,
  headerSortKeys?: HeaderSortKeys
): TDocumentDefinitions => {
  const content: Content = [
    {
      text: description,
      margin: [0, 20],
    },
  ];
  const tableData = jsonToTableData(
    Object.entries(data).map(([k, v]) => ({ Bezeichnung: k, ...v })),
    headerSortKeys
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
  headerSortKeys?: HeaderSortKeys
) => {
  const pdfDefinition = createOverviewPdf(data, description, headerSortKeys);
  return pdfMake.createPdf(pdfDefinition);
};
