const container = document.getElementById("trf-container");
const addBtn = document.getElementById("add-trf");

addBtn.addEventListener("click", () => {
  const div = document.createElement("div");
  div.classList.add("trf-item");

  div.innerHTML = `
    <input type="text" name="trf[]" placeholder="Enter TRF number" />
    <button type="button" class="remove-btn">✕</button>
  `;

  container.appendChild(div);
});

container.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    e.target.parentElement.remove();
  }
});
