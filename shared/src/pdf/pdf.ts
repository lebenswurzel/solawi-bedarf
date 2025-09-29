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
import { prettyCompactDate } from "../util/dateHelper";

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
  headers: Content[];
  rows: Content[][];
  widths?: string[];
}

export interface PdfSpec {
  receiver: string;
  description: string;
  description2?: string;
  footerTextLeft?: string;
  footerTextRight?: string;
  headerTextLeft?: string;
  tables: PdfTable[];
  additionalContent?: Content[];
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
  if (pdf.description2) {
    content.push({
      text: pdf.description2,
      margin: [0, 10, 0, 5],
      background: "#cccccc",
    });
  }

  for (const table of pdf.tables) {
    content.push({
      text: table.name,
      margin: [0, 20, 0, 5],
    });

    content.push({
      table: {
        widths: table.widths ?? new Array(table.headers.length).fill("*"),
        headerRows: 1,
        body: [
          table.headers.map((h) => {
            if (typeof h === "string") {
              return { text: h, bold: true, verticalAlignment: "bottom" };
            }
            return h;
          }),
          ...table.rows,
        ],
      },
      layout: "lightHorizontalLines",
    });
  }

  if (pdf.additionalContent) {
    content.push(...pdf.additionalContent);
  }

  const creationDate = prettyCompactDate(new Date());

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
  footerLeftText: string,
  headerSortKeys?: HeaderSortKeys
): TDocumentDefinitions => {
  const content: Content = [
    {
      text: description,
      margin: [0, 0, 0, 10],
    },
  ];

  const cellStyle = (rowIndex: number, columnIndex: number) => {
    if (rowIndex === 0) {
      return {
        bold: true,
      };
    }
    return {
      fontSize: columnIndex === 0 ? 10 : undefined,
      alignment: columnIndex === 0 ? "left" : "right",
      verticalAlignment: "middle",
    };
  };

  const cellTransformer = (
    cell: string | number,
    rowIndex: number,
    columnIndex: number
  ) => {
    if (rowIndex > 0 && columnIndex === 1) {
      return {
        text: cell,
        margin: [0, 0, 0, 10],
      };
    }
    return {
      text: cell,
    };
  };

  const tableData = jsonToTableData(
    Object.entries(data).map(([k, v]) => ({ Bezeichnung: k, ...v })),
    headerSortKeys
  ).map((row, rowIndex) =>
    row.map((cell, columnIndex) => ({
      ...cellTransformer(cell, rowIndex, columnIndex),
      ...cellStyle(rowIndex, columnIndex),
    }))
  );

  console.log(data, tableData);
  content.push({
    table: {
      widths: ["*", ...new Array(tableData[0].length - 1).fill(40)],
      body: tableData,
      headerRows: 1,
      dontBreakRows: true,
    },
    layout: "light-horizontal-lines",
  });

  const footer: DynamicContent = (currentPage, pageCount): Content => {
    const creationDate = prettyCompactDate(new Date());
    return {
      columns: [
        {
          text: `${footerLeftText}`,
          width: "*",
          fontSize: 10,
        },
        {
          text: `Seite ${currentPage} / ${pageCount}`,
          alignment: "center",
          width: "auto",
          fontSize: 10,
        },
        {
          text: `Erstellt am ${creationDate}`,
          alignment: "right",
          width: "*",
          fontSize: 10,
        },
      ],
      margin: [90, 5, 25, 15],
    };
  };

  return {
    pageOrientation: "landscape",
    pageMargins: [90, 25, 20, 35],
    content: content,
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 11,
      },
    },
    footer,
  };
};

export const generateOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string,
  footerLeftText: string,
  headerSortKeys?: HeaderSortKeys
) => {
  const pdfDefinition = createOverviewPdf(
    data,
    description,
    footerLeftText,
    headerSortKeys
  );
  return pdfMake.createPdf(pdfDefinition);
};
