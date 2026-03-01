import express from "express";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import fs from "fs";

import JsBarcode from "jsbarcode";
import { createSVGWindow } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";

const image = fs.readFileSync("./public/sourse/arrow_down_icon_143117.png");
const imageBase64 = Buffer.from(image).toString("base64");

function generateBarcode(barcode) {
  // створюємо "віртуальне" DOM-середовище для SVG
  const window = createSVGWindow();
  const document = window.document;
  registerWindow(window, document);
  // створюємо SVG
  const canvas = SVG(document.documentElement);
  canvas.rect(200, 100).fill("yellow").move(50, 50); // порожній прямокутник

  JsBarcode(canvas.node, barcode, {
    format: "CODE128", // тип штрихкоду
    displayValue: false, // підпис під кодом
    height: 50,
    width: 2,
    xmlDocument: document,
  });

  const svgString = canvas.svg();
  const svgBase64 = Buffer.from(svgString).toString("base64");

  // return `<img src="data:image/svg+xml;base64,${svgBase64}" />`;
  return `
    <div>
    <span style="font-size: 24px; text-align: center; display: block;">${barcode}</span>
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
        <body style="font-family: Arial, sans-serif; height: 170mm; padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 40px; width: 100%;">
            ${barcodesHtml}
          </div>
          <div>
            <p style="text-transform: uppercase; font-size: 54px; margin: 0;">poland M10</p>
          </div>
            <div style="width: 60px; height: 60px;">
              <img style="width: 100%; height: 100%;" src="data:image/png;base64,${imageBase64}" alt="arrow down" />
            </div>
            <div>
              <p style="font-size: 94px; letter-spacing: -5px; text-transform: uppercase; font-weight: bold; margin: 0;">${data.country}</p>
            </div>
          <div style="font-size: 34px; text-align: center; text-transform: uppercase; font-weight: bold;">${detail}</div>
          <div style="display: flex; justify-content: space-between; width: 100%; font-size: 28px; font-weight: bold;">
            <div>10.11.2026</div>
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
