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
import JSZip from "jszip";
import { TCreatedPdf } from "pdfmake/build/pdfmake";
import { PDFDocument, PDFPage } from "pdf-lib";

export class Zip {
  private jszip: JSZip;

  constructor() {
    this.jszip = new JSZip();
  }

  public async addPdf(pdf: TCreatedPdf, filename: string) {
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    this.jszip.file(filename, blob, { binary: true });
  }

  public async mergePdfs(pdfs: TCreatedPdf[], mergedFilename: string) {
    const mergedPdf = await PDFDocument.create();

    for (const pdf of pdfs) {
      const buffer = await new Promise<Uint8Array>((resolve) => {
        pdf.getBuffer((buffer) => resolve(buffer));
      });
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page: PDFPage) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    this.jszip.file(mergedFilename, mergedPdfBytes, { binary: true });
  }

  public download(filename: string) {
    this.jszip.generateAsync({ type: "blob" }).then((content) => {
      const blob = new Blob([content], { type: "zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }
}
