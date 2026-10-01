// Задание 7 (Средний): регистрация аккаунта
// Поля: логин, e-mail, пароль, повтор пароля
// Проверки: длина пароля >= 8 символов, совпадение паролей, логин и e-mail не пустые

const form = document.getElementById('accountForm');
const result = document.getElementById('result');

const loginInput = document.getElementById('login');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('passwordConfirm');
const passwordHint = document.getElementById('passwordHint');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_LOGIN_LENGTH = 3;

function setInvalid(el, errorEl, message) {
  el.classList.remove('valid');
  el.classList.add('invalid');
  if (errorEl) errorEl.textContent = message;
}

function setValid(el, errorEl) {
  el.classList.remove('invalid');
  el.classList.add('valid');
  if (errorEl) errorEl.textContent = '';
}

// --- Живая проверка логина ---
function validateLogin() {
  const value = loginInput.value.trim();
  const errorEl = document.getElementById('loginError');
  if (value === '') {
    setInvalid(loginInput, errorEl, 'Введите логин');
    return false;
  }
  if (value.length < MIN_LOGIN_LENGTH) {
    setInvalid(loginInput, errorEl, `Логин должен содержать минимум ${MIN_LOGIN_LENGTH} символа`);
    return false;
  }
  setValid(loginInput, errorEl);
  return true;
}

// --- Живая проверка e-mail ---
function validateEmail() {
  const value = emailInput.value.trim();
  const errorEl = document.getElementById('emailError');
  if (value === '') {
    setInvalid(emailInput, errorEl, 'Введите e-mail');
    return false;
  }
  if (!emailPattern.test(value)) {
    setInvalid(emailInput, errorEl, 'Некорректный формат e-mail');
    return false;
  }
  setValid(emailInput, errorEl);
  return true;
}

// --- Живая проверка пароля (счетчик символов + минимальная длина) ---
function validatePassword() {
  const value = passwordInput.value;
  const errorEl = document.getElementById('passwordError');
  passwordHint.textContent = `Длина: ${value.length} / ${MIN_PASSWORD_LENGTH}`;

  if (value === '') {
    setInvalid(passwordInput, errorEl, 'Введите пароль');
    return false;
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    setInvalid(passwordInput, errorEl, `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
    return false;
  }
  setValid(passwordInput, errorEl);
  return true;
}

// --- Живая проверка совпадения паролей ---
function validatePasswordConfirm() {
  const errorEl = document.getElementById('passwordConfirmError');
  if (passwordConfirmInput.value === '') {
    setInvalid(passwordConfirmInput, errorEl, 'Повторите пароль');
    return false;
  }
  if (passwordConfirmInput.value !== passwordInput.value) {
    setInvalid(passwordConfirmInput, errorEl, 'Пароли не совпадают');
    return false;
  }
  setValid(passwordConfirmInput, errorEl);
  return true;
}

// Проверка при вводе (динамический индикатор корректности)
loginInput.addEventListener('input', validateLogin);
emailInput.addEventListener('input', validateEmail);
passwordInput.addEventListener('input', () => {
  validatePassword();
  // при изменении пароля также перепроверяем повтор, если он уже заполнен
  if (passwordConfirmInput.value !== '') validatePasswordConfirm();
});
passwordConfirmInput.addEventListener('input', validatePasswordConfirm);

// Проверка при отправке формы
form.addEventListener('submit', function (event) {
  event.preventDefault();

  const loginOk = validateLogin();
  const emailOk = validateEmail();
  const passwordOk = validatePassword();
  const confirmOk = validatePasswordConfirm();

  if (!(loginOk && emailOk && passwordOk && confirmOk)) {
    result.className = 'result';
    result.style.display = 'none';
    return;
  }

  result.className = 'result success';
  result.innerHTML =
    '<strong>Аккаунт успешно создан!</strong><br>' +
    'Логин: ' + loginInput.value.trim() + '<br>' +
    'E-mail: ' + emailInput.value.trim();

  form.reset();
  passwordHint.textContent = `Длина: 0 / ${MIN_PASSWORD_LENGTH}`;
  [loginInput, emailInput, passwordInput, passwordConfirmInput].forEach((el) =>
    el.classList.remove('valid', 'invalid')
  );
});
