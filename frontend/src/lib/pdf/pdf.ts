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
import pdfMake, { TCreatedPdf } from "pdfmake/build/pdfmake";
import { pdfFonts } from "../../assets/vfs_fonts";
import { Content, DynamicContent, TDocumentDefinitions } from "pdfmake/interfaces";
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
      if (row1[0] > row2[0]) {
        return 1;
      }
      if (row1[0] < row2[0]) {
        return -1;
      }
      return 0;
    });
  return [[...headers], ...tableData];
};

export interface PdfTable {
  name: string,
  data: { [key: string]: string | number }[]
}

export class PdfCreator {
  private readonly content: Content[];
  private textLeft: string = "";
  private textCenter: string = "";

  public constructor(receiver: string, description: string) {
    this.content = [];
    if (logo != null) {
      this.content.push({
        image: `${logo}`,
        fit: [200, 60],
        alignment: "center"
      });
    }

    this.content.push({
      table: {
        widths: ["*", "*"],
        body: [
          [
            {
              text: receiver,
              bold: true
            },
            {
              text: `${appConfig.address.name}\n${appConfig.address.street}\n${appConfig.address.postalcode} ${appConfig.address.city}`,
              bold: true
            }
          ]
        ]
      },
      layout: "noBorders",
      margin: [0, logo ? 10 : 60, 0, 20]
    });
    this.content.push({
      text: description
    });
  }

  public setFooter(textLeft: string, textCenter: string): PdfCreator {
    this.textLeft = textLeft;
    this.textCenter = textCenter;
    return this;
  }

  public addTable(table: PdfTable): PdfCreator {
    const tableData = jsonToTableData(table.data);
    this.content.push({
      text: table.name,
      margin: [0, 20]
    });
    this.content.push({
      table: {
        widths: new Array(tableData[0].length).fill("*"),
        body: tableData
      },
      layout: "light-horizontal-lines"
    });

    return this;
  }

  public createDefinition(): TDocumentDefinitions {
    const footer: DynamicContent = (currentPage, pageCount): Content => {
      return {
        columns: [
          {
            text: this.footerTextLeft || "",
            width: "*"
          },
          {
            text: this.footerTextCenter || "",
            alignment: "center",
            width: "auto",
            margin: [10, 0]
          },
          {
            text: `Seite ${currentPage} / ${pageCount}`,
            alignment: "right",
            width: "auto"
          }
        ],
        margin: [20, 0, 20, -30]
      };
    };

    return {
      content: this.content,
      styles: {
        tableHeader: {
          bold: true,
          fontSize: 11
        }
      },
      footer,
      pageMargins: [20, 60, 20, 40]
    };
  }

  public create(): TCreatedPdf {
    pdfMake.createPdf(this.createDefinition());
  }
}

const createPdf = (
  data: { [key: string]: { [key: string]: string | number }[] },
  receiver: string,
  description: string,
  footerTextLeft?: string,
  footerTextCenter?: string
): TDocumentDefinitions => {
  const pdf = new PdfCreator(receiver, description);
  pdf.setFooter(footerTextLeft, footerTextCenter);
  for (const [name, tableData] of Object.entries(data)) {
    pdf.addTable({ name, data: tableData });
  }
  return pdf.createDefinition();
};

const createOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string
): TDocumentDefinitions => {
  const content: Content = [
    {
      text: description,
      margin: [0, 20]
    }
  ];
  const tableData = jsonToTableData(
    Object.entries(data).map(([k, v]) => ({ Bezeichnung: k, ...v }))
  );
  content.push({
    table: {
      widths: ["*", ...new Array(tableData[0].length - 1).fill(40)],
      body: tableData
    },
    layout: "light-horizontal-lines"
  });
  return {
    pageOrientation: "landscape",
    content: content,
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 11
      }
    }
  };
};

export const generatePdf = (
  data: { [key: string]: { [key: string]: string | number }[] },
  receiver: string,
  description: string,
  footerTextLeft?: string,
  footerTextCenter?: string
) => {
  const pdfDefinition = createPdf(
    data,
    receiver,
    description,
    footerTextLeft,
    footerTextCenter
  );
  return pdfMake.createPdf(pdfDefinition);
};

export const generateOverviewPdf = (
  data: { [key: string]: { [key: string]: number } },
  description: string
) => {
  const pdfDefinition = createOverviewPdf(data, description);
  return pdfMake.createPdf(pdfDefinition);
};
