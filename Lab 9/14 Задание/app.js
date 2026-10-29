// Лабораторная №9, вариант 14: каталог альбомов; при выборе альбома подгружаются его фотографии
const BASE_URL = 'https://jsonplaceholder.typicode.com';

const albumsBox = document.querySelector('#albums');
const albumsStatus = document.querySelector('#albumsStatus');
const retryAlbums = document.querySelector('#retryAlbums');
const photosBox = document.querySelector('#photos');
const photosStatus = document.querySelector('#photosStatus');
const photosTitle = document.querySelector('#photosTitle');
const retryPhotos = document.querySelector('#retryPhotos');
const stats = document.querySelector('#stats');

let selectedAlbum = null;
let photoController = null;
let requestCount = 0;

function setStatus(el, type, text) {
  el.className = `status ${type}`;
  el.textContent = text;
}

// Творческая функция: счётчик запросов (видно, что фото подгружаются только по клику)
function countRequest() {
  requestCount++;
  stats.textContent = `Отправлено запросов: ${requestCount}`;
}

async function loadAlbums() {
  retryAlbums.hidden = true;
  albumsBox.replaceChildren();
  setStatus(albumsStatus, 'loading', 'Загрузка...');
  countRequest();

  try {
    const response = await fetch(`${BASE_URL}/albums?_limit=20`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const albums = await response.json();

    if (!Array.isArray(albums) || albums.length === 0) {
      setStatus(albumsStatus, 'empty', 'Альбомов нет');
      return;
    }
    for (const album of albums) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'album';
      btn.dataset.id = String(album.id);
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = `${album.id}. ${album.title ?? '(без названия)'}`;
      btn.addEventListener('click', () => selectAlbum(album, btn));
      albumsBox.append(btn);
    }
    setStatus(albumsStatus, 'success', `Альбомов: ${albums.length}`);
  } catch (error) {
    setStatus(albumsStatus, 'error', `Ошибка загрузки: ${error.message}`);
    retryAlbums.hidden = false;
  }
}

// Фото: если картинка недоступна — вместо неё показываем текст
function createPhoto(photo) {
  const figure = document.createElement('figure');
  figure.className = 'photo';

  const fallback = (text) => {
    const box = document.createElement('div');
    box.className = 'thumb-fallback';
    box.textContent = text;
    return box;
  };

  const url = String(photo.thumbnailUrl ?? '');
  if (url.startsWith('https://')) {
    const img = document.createElement('img');
    img.alt = photo.title ?? '';
    img.loading = 'lazy';
    img.addEventListener('error', () => img.replaceWith(fallback('Изображение недоступно')));
    img.src = url;
    figure.append(img);
  } else {
    figure.append(fallback('Нет изображения'));
  }

  const caption = document.createElement('figcaption');
  caption.textContent = `${photo.id}. ${photo.title ?? ''}`;
  figure.append(caption);
  return figure;
}

async function loadPhotos(album) {
  photoController?.abort(); // быстрый переход к другому альбому отменяет предыдущий запрос
  const current = new AbortController();
  photoController = current;

  retryPhotos.hidden = true;
  photosBox.replaceChildren();
  photosTitle.textContent = `Фотографии альбома ${album.id}`;
  setStatus(photosStatus, 'loading', 'Загрузка...');
  countRequest();

  try {
    const url = `${BASE_URL}/photos?albumId=${encodeURIComponent(album.id)}&_limit=12`;
    const response = await fetch(url, { signal: current.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const photos = await response.json();

    if (!Array.isArray(photos) || photos.length === 0) {
      setStatus(photosStatus, 'empty', 'В этом альбоме нет фотографий');
      return;
    }
    for (const photo of photos) photosBox.append(createPhoto(photo));
    setStatus(photosStatus, 'success', `Загружено фотографий: ${photos.length}`);
  } catch (error) {
    if (error.name === 'AbortError') return;
    setStatus(photosStatus, 'error', `Ошибка загрузки: ${error.message}`);
    retryPhotos.hidden = false;
  }
}

function selectAlbum(album, btn) {
  selectedAlbum = album;
  for (const b of albumsBox.querySelectorAll('button.album')) {
    b.setAttribute('aria-pressed', String(b === btn));
  }
  loadPhotos(album);
}

retryAlbums.addEventListener('click', loadAlbums);
retryPhotos.addEventListener('click', () => {
  if (selectedAlbum) loadPhotos(selectedAlbum);
});

loadAlbums();
