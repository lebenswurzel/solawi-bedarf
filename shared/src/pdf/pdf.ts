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
  additionalTopMessage?: Content;
  timezone?: string;
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
    margin: [0, 0, 0, 20],
  });
  if (pdf.additionalTopMessage) {
    content.push(pdf.additionalTopMessage);
  }
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

  const creationDate = prettyCompactDate(new Date(), pdf.timezone);

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
    pageMargins: [40, pdf.headerTextLeft ? 60 : 30, 40, 60],
  });
}

export const LANDSCAPE_A4_WIDTH_PT = 781.89;
export const OVERVIEW_HORIZONTAL_MARGINS_PT = 90 + 30;
export const OVERVIEW_LABEL_WIDTH_PT = 100;
export const OVERVIEW_NUM_COL_WIDTH_PT = 35;
export const OVERVIEW_FIXED_HEADERS = ["Bezeichnung", "Summe"] as const;
export const OVERVIEW_CONTINUATION_LABEL_HEADER = "Bezeichnung\n(fortsetzung)";

export function getMaxDepotsPerPage(
  availableWidth: number = LANDSCAPE_A4_WIDTH_PT -
    OVERVIEW_HORIZONTAL_MARGINS_PT,
  labelWidth: number = OVERVIEW_LABEL_WIDTH_PT,
  numColWidth: number = OVERVIEW_NUM_COL_WIDTH_PT
): number {
  return Math.max(
    1,
    Math.floor((availableWidth - labelWidth) / numColWidth) - 1
  );
}

export function chunkOverviewHeaders(
  headers: string[],
  maxDepotsPerPage: number
): string[][] {
  const depotHeaders = headers.filter(
    (h) =>
      !OVERVIEW_FIXED_HEADERS.includes(
        h as (typeof OVERVIEW_FIXED_HEADERS)[number]
      )
  );
  if (depotHeaders.length === 0) {
    return [headers];
  }
  const chunks: string[][] = [];
  for (let i = 0; i < depotHeaders.length; i += maxDepotsPerPage) {
    const isFirstChunk = i === 0;
    chunks.push([
      ...(headers.includes("Bezeichnung") ? ["Bezeichnung"] : []),
      ...(isFirstChunk && headers.includes("Summe") ? ["Summe"] : []),
      ...depotHeaders.slice(i, i + maxDepotsPerPage),
    ]);
  }
  return chunks;
}

export function sliceTableByHeaders(
  fullTable: (string | number)[][],
  chunkHeaders: string[]
): (string | number)[][] {
  const headers = fullTable[0].map(String);
  const indices = chunkHeaders.map((h) => headers.indexOf(h));
  return fullTable.map((row) => indices.map((i) => (i >= 0 ? row[i] : "")));
}

const createOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string,
  footerLeftText: string,
  headerSortKeys?: HeaderSortKeys
): TDocumentDefinitions => {
  const content: Content[] = [
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
    columnIndex: number,
    hasSummeColumn: boolean
  ) => {
    if (rowIndex > 0 && columnIndex === 1 && hasSummeColumn) {
      return {
        text: cell,
        margin: [0, 0, 0, 10],
      };
    }
    return {
      text: cell,
    };
  };

  const buildStyledTableBody = (rawTable: (string | number)[][]) => {
    const hasSummeColumn = rawTable[0]?.[1] === "Summe";
    return rawTable.map((row, rowIndex) =>
      row.map((cell, columnIndex) => ({
        ...cellTransformer(cell, rowIndex, columnIndex, hasSummeColumn),
        ...cellStyle(rowIndex, columnIndex),
      }))
    );
  };

  const rawTableData = jsonToTableData(
    Object.entries(data).map(([k, v]) => ({ Bezeichnung: k, ...v })),
    headerSortKeys
  );
  const headers = rawTableData[0].map(String);
  const headerChunks = chunkOverviewHeaders(headers, getMaxDepotsPerPage());

  headerChunks.forEach((chunkHeaders, chunkIndex) => {
    const slicedRaw = sliceTableByHeaders(rawTableData, chunkHeaders);
    if (chunkIndex > 0) {
      slicedRaw[0][0] = OVERVIEW_CONTINUATION_LABEL_HEADER;
    }
    content.push({
      table: {
        widths: [
          OVERVIEW_LABEL_WIDTH_PT,
          ...new Array(chunkHeaders.length - 1).fill(OVERVIEW_NUM_COL_WIDTH_PT),
        ],
        body: buildStyledTableBody(slicedRaw),
        headerRows: 1,
        dontBreakRows: true,
      },
      layout: "light-horizontal-lines",
      ...(chunkIndex > 0 ? { pageBreak: "before" as const } : {}),
    });
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
