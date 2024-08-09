import { pdf } from "pdf-to-img";
import { promises as fs } from "node:fs";
import tesseract from "node-tesseract-ocr";

export const importMenu = async (PDFurl: string) => {
  const pdfRequest = await fetch(PDFurl);
  const pdfArrayBuffer = await pdfRequest.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  const images = await pdf(pdfBuffer);
  let c = 1;
  for await (const i of images) {
    await fs.writeFile(`nom-nom-nom/lunch-${c}.png`, i);
    c++;
  }

  const t = await tesseract.recognize(`nom-nom-nom/lunch-1.png`, {
    lang: "eng",
  });
  console.log(t.split("\n"));
};

await importMenu(
  "https://www.lancastermennonite.org/wp-content/uploads/2023/02/MS-HS-MAY-3-Menu-1.pdf"
);
