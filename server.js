import express from "express";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

import JsBarcode from "jsbarcode";
import { createSVGWindow } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";
import puppeteer from "puppeteer";

// створюємо "віртуальне" DOM-середовище для SVG
const window = createSVGWindow();
const document = window.document;
registerWindow(window, document);

// створюємо SVG
const canvas = SVG(document.documentElement);
canvas.rect(200, 100).fill("yellow").move(50, 50); // порожній прямокутник

// console.log(["canvas"], canvas.svg());

JsBarcode(canvas.node, "1234567890128", {
  format: "CODE128", // тип штрихкоду
  displayValue: true, // підпис під кодом
  height: 80,
  width: 2,
  xmlDocument: document,
});

const svgString = canvas.svg();
const svgBase64 = Buffer.from(svgString).toString("base64");

const app = express();

// Головна сторінка

app.use(express.static("public"));

// Маршрут для генерації PDF
app.post("/api/generate-pdf", async (req, res) => {
  const data = req.body;
  console.log(["data"], data);

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
    // const browser = await puppeteer.launch({
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });
    const page = await browser.newPage();

    // HTML, який буде в PDF
    await page.setContent(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 30px;">
          <h1 style="text-align: center;">PDF з Node.js</h1>
          <div><img src="data:image/svg+xml;base64,${svgBase64}" /></div>
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
const PORT = 3000;
// Запуск сервера
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
