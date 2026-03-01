const container = document.getElementById("trf-container");
const addBtn = document.getElementById("add-trf");

addBtn.addEventListener("click", () => {
  const div = document.createElement("div");
  div.classList.add("trf-item");

  div.innerHTML = `
    <input type="text" name="trf" placeholder="Enter TRF number" />
    <button type="button" class="remove-btn">✕</button>
  `;

  container.appendChild(div);
});

container.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    e.target.parentElement.remove();
  }
});
// Обробка форми
const form = document.getElementById("pdf-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  console.log(["formData"], formData);

  // перетворюємо FormData в об’єкт
  const data = {};
  formData.forEach((value, key) => {
    // якщо ключ вже існує (checkbox або масив), робимо масив
    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  });

  console.log(["data"], data);

  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("Network error");

    // отримуємо PDF як Blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    window.open(url, "_blank");

    // відкриваємо в новій вкладці
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "file.pdf"; // ім’я файлу
    // a.click();
    // window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Error generating PDF");
  }
});
