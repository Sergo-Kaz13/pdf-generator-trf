import express from "express";
import puppeteer from "puppeteer";

import JsBarcode from "jsbarcode";
import { createSVGWindow } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";

// створюємо "віртуальне" DOM-середовище для SVG
const window = createSVGWindow();
const document = window.document;

registerWindow(window, document);
// створюємо SVG
const draw = SVG(document.documentElement);
const barcode = draw.rect(200, 100); // порожній прямокутник
JsBarcode(barcode.node, "123456789012", {
  format: "EAN13", // тип штрихкоду
  displayValue: true, // підпис під кодом
  height: 50,
});

// const canvas = SVG(document.documentElement);
// canvas.rect(100, 100).fill("yellow").move(50, 50);

// console.log(canvas.svg());

// const draw = SVG(document.documentElement);
// const barcode = draw.rect(200, 100); // порожній прямокутник
// JsBarcode(barcode.node, "123456789012", {
//   format: "EAN13",
//   displayValue: true,
//   height: 50,
// });

// // отримуємо SVG як рядок
const svgString = barcode.svg();

const app = express();

// Головна сторінка
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>PDF Generator</h1>
        <p>Натисни кнопку нижче, щоб згенерувати PDF</p>
        <a href="/generate-pdf">
          <button style="padding: 10px 20px; font-size: 16px;">Згенерувати PDF</button>
        </a>
      </body>
    </html>
  `);
});

// Маршрут для генерації PDF
app.get("/generate-pdf", async (req, res) => {
  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    // HTML, який буде в PDF
    await page.setContent(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 30px;">
          <h1 style="text-align: center;">PDF з Node.js</h1>
          <div>${svgString}</div>
          <p>Згенеровано за допомогою Puppeteer</p>
          <p>Можна додавати будь-який HTML та CSS!</p>
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

// Запуск сервера
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
