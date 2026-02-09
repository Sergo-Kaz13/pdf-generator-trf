import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/generate-pdf", async (req, res) => {
  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.setContent(`
      <html>
        <body>
          <h1>PDF з Node.js</h1>
          <p>Згенеровано за допомогою Puppeteer</p>
        </body>
      </html>
    `);

    const pdfBuffer = await page.pdf({ format: "A4" });

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

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
