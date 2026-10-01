// Задание 18 (Повышенный): бронирование мероприятия
// Поля: ФИО, e-mail, категория билета (radio), количество, доп. опции (checkbox)
// После валидации — расчет итоговой стоимости

const form = document.getElementById('bookingForm');
const result = document.getElementById('result');
const liveTotal = document.getElementById('liveTotal');

const fioInput = document.getElementById('fio');
const emailInput = document.getElementById('email');
const quantityInput = document.getElementById('quantity');
const ticketRadios = document.getElementsByName('ticket');
const addonCheckboxes = document.getElementsByName('addon');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(el, errorEl, message) {
  if (el) el.classList.add('invalid');
  errorEl.textContent = message;
}

function clearError(el, errorEl) {
  if (el) el.classList.remove('invalid');
  errorEl.textContent = '';
}

function getSelectedTicket() {
  for (const radio of ticketRadios) {
    if (radio.checked) {
      return { value: radio.value, price: Number(radio.dataset.price) };
    }
  }
  return null;
}

function getSelectedAddons() {
  const selected = [];
  for (const cb of addonCheckboxes) {
    if (cb.checked) {
      selected.push({ name: cb.parentElement.textContent.trim(), price: Number(cb.dataset.price) });
    }
  }
  return selected;
}

function calculateTotal() {
  const ticket = getSelectedTicket();
  const quantity = Number(quantityInput.value) || 0;
  if (!ticket || quantity <= 0) return 0;

  const addons = getSelectedAddons();
  const addonsSum = addons.reduce((sum, a) => sum + a.price, 0);

  return (ticket.price + addonsSum) * quantity;
}

// Живое обновление итоговой суммы при любом изменении полей
function updateLiveTotal() {
  const total = calculateTotal();
  liveTotal.textContent = `Итого: ${total.toLocaleString('ru-RU')} ₸`;
}

quantityInput.addEventListener('input', updateLiveTotal);
for (const radio of ticketRadios) radio.addEventListener('change', updateLiveTotal);
for (const cb of addonCheckboxes) cb.addEventListener('change', updateLiveTotal);

form.addEventListener('submit', function (event) {
  event.preventDefault();

  let isValid = true;

  const fio = fioInput.value.trim();
  const email = emailInput.value.trim();
  const quantity = Number(quantityInput.value);
  const ticket = getSelectedTicket();

  // ФИО
  const fioError = document.getElementById('fioError');
  if (fio === '') {
    showError(fioInput, fioError, 'Введите ФИО');
    isValid = false;
  } else {
    clearError(fioInput, fioError);
  }

  // E-mail
  const emailError = document.getElementById('emailError');
  if (email === '') {
    showError(emailInput, emailError, 'Введите e-mail');
    isValid = false;
  } else if (!emailPattern.test(email)) {
    showError(emailInput, emailError, 'Некорректный формат e-mail');
    isValid = false;
  } else {
    clearError(emailInput, emailError);
  }

  // Категория билета
  const ticketError = document.getElementById('ticketError');
  if (!ticket) {
    showError(null, ticketError, 'Выберите категорию билета');
    isValid = false;
  } else {
    clearError(null, ticketError);
  }

  // Количество
  const quantityError = document.getElementById('quantityError');
  if (!Number.isInteger(quantity) || quantity <= 0) {
    showError(quantityInput, quantityError, 'Количество билетов должно быть целым числом больше 0');
    isValid = false;
  } else {
    clearError(quantityInput, quantityError);
  }

  if (!isValid) {
    result.className = 'result';
    result.style.display = 'none';
    return;
  }

  // Расчет итоговой стоимости
  const addons = getSelectedAddons();
  const addonsSum = addons.reduce((sum, a) => sum + a.price, 0);
  const total = (ticket.price + addonsSum) * quantity;

  const addonsList = addons.length
    ? addons.map((a) => `${a.name}`).join(', ')
    : 'без дополнительных опций';

  result.className = 'result success';
  result.innerHTML =
    '<strong>Бронирование подтверждено!</strong><br>' +
    'ФИО: ' + fio + '<br>' +
    'E-mail: ' + email + '<br>' +
    'Категория: ' + ticket.value + '<br>' +
    'Количество: ' + quantity + '<br>' +
    'Опции: ' + addonsList + '<br>' +
    '<strong>Итоговая стоимость: ' + total.toLocaleString('ru-RU') + ' ₸</strong>';

  form.reset();
  updateLiveTotal();
});
