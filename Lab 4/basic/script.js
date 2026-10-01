// Задание 1 (Базовый): форма регистрации студента
// Поля: ФИО, e-mail, курс (select), согласие с правилами (checkbox)

const form = document.getElementById('studentForm');
const result = document.getElementById('result');

const fioInput = document.getElementById('fio');
const emailInput = document.getElementById('email');
const courseSelect = document.getElementById('course');
const agreeCheckbox = document.getElementById('agree');

// Простое регулярное выражение для проверки e-mail
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(fieldEl, errorEl, message) {
  fieldEl.classList.add('invalid');
  errorEl.textContent = message;
}

function clearError(fieldEl, errorEl) {
  fieldEl.classList.remove('invalid');
  errorEl.textContent = '';
}

form.addEventListener('submit', function (event) {
  event.preventDefault(); // отменяем стандартную отправку формы

  let isValid = true;

  const fio = fioInput.value.trim();
  const email = emailInput.value.trim();
  const course = courseSelect.value;
  const agree = agreeCheckbox.checked;

  // Проверка ФИО
  const fioError = document.getElementById('fioError');
  if (fio === '') {
    showError(fioInput, fioError, 'Введите ФИО');
    isValid = false;
  } else if (fio.length < 5) {
    showError(fioInput, fioError, 'ФИО слишком короткое');
    isValid = false;
  } else {
    clearError(fioInput, fioError);
  }

  // Проверка e-mail
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

  // Проверка курса
  const courseError = document.getElementById('courseError');
  if (course === '') {
    showError(courseSelect, courseError, 'Выберите курс');
    isValid = false;
  } else {
    clearError(courseSelect, courseError);
  }

  // Проверка согласия
  const agreeError = document.getElementById('agreeError');
  if (!agree) {
    agreeError.textContent = 'Необходимо подтвердить согласие с правилами';
    isValid = false;
  } else {
    agreeError.textContent = '';
  }

  if (!isValid) {
    result.className = 'result';
    result.style.display = 'none';
    return;
  }

  // Форма прошла проверку — выводим итог без перезагрузки страницы
  result.className = 'result success';
  result.innerHTML =
    '<strong>Регистрация успешна!</strong><br>' +
    'ФИО: ' + fio + '<br>' +
    'E-mail: ' + email + '<br>' +
    'Курс: ' + course;

  form.reset();
});
