const form = document.querySelector("#studentForm");
const nameInput = document.querySelector("#nameInput");
const scoreInput = document.querySelector("#scoreInput");
const tbody = document.querySelector("#tableBody");
const message = document.querySelector("#message");
const searchInput = document.querySelector("#searchInput");
const count = document.querySelector("#count");
const average = document.querySelector("#average");

function updateStats() {
  const rows = tbody.querySelectorAll("tr");
  let sum = 0;
  rows.forEach((row, i) => {
    row.cells[0].textContent = i + 1;         
    sum += Number(row.dataset.score);
  });
  count.textContent = rows.length;
  average.textContent = rows.length ? (sum / rows.length).toFixed(1) : "—";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();                      
  const name = nameInput.value.trim();
  const score = Number(scoreInput.value);
  if (name === "" || scoreInput.value === "" || score < 0 || score > 100) {
    message.textContent = "Введите имя и балл от 0 до 100.";
    return;
  }
  message.textContent = "";

  const row = document.createElement("tr");
  row.dataset.score = score;
  row.classList.add(score >= 85 ? "high" : score < 50 ? "low" : "mid");
  const delBtn = document.createElement("button");
  delBtn.textContent = "Удалить";
  delBtn.addEventListener("click", () => {
    row.remove();
    updateStats();
  });
  const cells = ["", name, score].map((value) => {
    const td = document.createElement("td");
    td.textContent = value;
    return td;
  });
  const actionCell = document.createElement("td");
  actionCell.append(delBtn);
  row.append(...cells, actionCell);
  tbody.append(row);

  form.reset();
  nameInput.focus();
  updateStats();
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  tbody.querySelectorAll("tr").forEach((row) => {
    const name = row.cells[1].textContent.toLowerCase();
    row.classList.toggle("hidden", !name.includes(query));
  });
});
