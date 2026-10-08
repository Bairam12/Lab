const input = document.querySelector("#noteInput");
const addBtn = document.querySelector("#addBtn");
const list = document.querySelector("#noteList");
const message = document.querySelector("#message");
const counter = document.querySelector("#counter");

function updateCounter() {
  counter.textContent = list.children.length;
}

function addNote() {
  const text = input.value.trim();
  if (text === "") {
    message.textContent = "Заметка не может быть пустой!";
    input.classList.add("error");
    return;
  }
  message.textContent = "";
  input.classList.remove("error");

  const item = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = text;               
  const delBtn = document.createElement("button");
  delBtn.textContent = "Удалить";
  delBtn.className = "del";
  delBtn.setAttribute("title", "Удалить заметку");
  delBtn.addEventListener("click", () => {
    item.classList.add("removing");
    setTimeout(() => { item.remove(); updateCounter(); }, 200);
  });
  item.append(span, delBtn);
  list.prepend(item);

  input.value = "";
  input.focus();
  updateCounter();
}

addBtn.addEventListener("click", addNote);
input.addEventListener("input", () => {
  input.classList.remove("error");
  message.textContent = "";
});
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") addNote();
});
