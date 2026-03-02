import express from "express";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

import JsBarcode from "jsbarcode";
import { createSVGWindow } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";

function generateBarcode(barcode) {
  if(!barcode) {
    throw new Error("Barcode is required") 
  }
  // створюємо "віртуальне" DOM-середовище для SVG
  const window = createSVGWindow();
  const document = window.document;
  registerWindow(window, document);
  // створюємо SVG
  const canvas = SVG(document.documentElement);
  canvas.rect(200, 100).fill("yellow").move(50, 50); // порожній прямокутник


  JsBarcode(canvas.node, String(barcode).trim(), {
    format: "CODE128", // тип штрихкоду
    displayValue: false, // підпис під кодом
    height: 50,
    width: 1.5,
    xmlDocument: document,
  });

  const svgString = canvas.svg();
  const svgBase64 = Buffer.from(svgString).toString("base64");

  // return `<img src="data:image/svg+xml;base64,${svgBase64}" />`;
  return `
    <div>
    <span style="font-size: 36px; border-bottom: 2px solid black; text-align: center; display: block;">${barcode}</span>
    <img src="data:image/svg+xml;base64,${svgBase64}" />
    </div>`;

  // return canvas.svg();
}

const app = express();

// Головна сторінка

app.use(express.json()); // для JSON
app.use(express.urlencoded({ extended: true })); // для form-data

app.use(express.static("public"));

// Маршрут для генерації PDF
app.post("/api/generate-pdf", async (req, res) => {
  const data = req.body;
  console.log(["data"], data);
  const arrTrf = Array.isArray(data.trf) ? data.trf.filter(Boolean) : data.trf;

  const formatted = new Date().toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });

  const barcodesHtml =
    Array.isArray(arrTrf) && arrTrf.length > 0
      ? arrTrf.map((item) => generateBarcode(item)).join("")
      : arrTrf
        ? generateBarcode(arrTrf)
        : "";

  const detail = Array.isArray(data.card) ? data.card.join(" + ") : data.card;

  const isProduction = process.env.NODE_ENV === "production";

  try {
    const browser = isProduction
      ? await puppeteerCore.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        })
      : await puppeteer.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    const page = await browser.newPage();

    // HTML, який буде в PDF
    await page.setContent(`
      <html>
        <body style="font-family: Arial, sans-serif; height: 180mm; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 20px; width: 100%;">
            ${barcodesHtml}
          </div>
          <div style="display: flex; justify-content: center; align-items: center; font-size: 74px; font-weight: bold; text-transform: uppercase; width: 100%; gap: 15px;">
            <p>PLA(M13)</p>
            <div style="text-align: center;">&gt;&gt;&gt;</div>
            <p>${data.country}</p>
          </div>
          <div style="font-size: 34px; text-align: center; text-transform: uppercase; font-weight: bold;">${detail}</div>
          <div style="display: flex; justify-content: space-between; width: 100%; font-size: 24px;">
            <div style="font-size: 32px;">${formatted}</div>
            <div>pallet: 1/1</div>
          </div>
        </body>
      </html>
    `);

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=file.pdf",
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating PDF");
  }
});
const PORT = 3000;
// Запуск сервера
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
