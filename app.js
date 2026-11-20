'use strict';

const USERS_URL = 'https://jsonplaceholder.typicode.com/users';
const POSTS_URL = 'https://jsonplaceholder.typicode.com/posts';
const loadButton = document.querySelector('#load-users');
const searchInput = document.querySelector('#search-name');
const usersContainer = document.querySelector('#users');
const postsContainer = document.querySelector('#posts');
const usersMessage = document.querySelector('#users-message');
const postsMessage = document.querySelector('#posts-message');
let allUsers = [];
let selectedUserId = null;
let postsRequestNumber = 0;

function showMessage(element, text, kind = '') {
  element.textContent = text;
  element.dataset.kind = kind;
}

function makeEmpty(text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'empty';
  paragraph.textContent = text;
  return paragraph;
}

function errorText(error) {
  if (error.name === 'AbortError') return 'Сервер не ответил вовремя. Попробуйте ещё раз.';
  if (error instanceof TypeError) return 'Не удалось связаться с сервером. Проверьте интернет и повторите попытку.';
  return `${error.message} Попробуйте ещё раз.`;
}

async function requestJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Ошибка сервера: HTTP ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function makePost(post) {
  const article = document.createElement('article');
  article.className = 'post';
  const number = document.createElement('span');
  number.className = 'post-id';
  number.textContent = `ПУБЛИКАЦИЯ ID ${post.id}`;
  const title = document.createElement('h3');
  title.textContent = post.title;
  const body = document.createElement('p');
  body.textContent = post.body;
  article.append(number, title, body);
  return article;
}

async function loadPosts(user, button) {
  // Номер запроса не позволяет запоздавшему ответу заменить публикации другого пользователя.
  const requestNumber = ++postsRequestNumber;
  selectedUserId = user.id;
  button.disabled = true;
  postsContainer.setAttribute('aria-busy', 'true');
  postsContainer.replaceChildren();
  showMessage(postsMessage, 'Загрузка...', 'loading');
  try {
    const data = await requestJSON(`${POSTS_URL}?userId=${encodeURIComponent(user.id)}`);
    if (requestNumber !== postsRequestNumber) return;
    if (!Array.isArray(data)) throw new Error('Сервер вернул неверный формат публикаций.');
    postsContainer.replaceChildren(...data.slice(0, 3).map(makePost));
    if (data.length === 0) {
      postsContainer.replaceChildren(makeEmpty('Публикации не найдены.'));
    }
    showMessage(postsMessage, `Публикации пользователя ${user.name}: ${Math.min(data.length, 3)}.`, 'success');
  } catch (error) {
    if (requestNumber !== postsRequestNumber) return;
    showMessage(postsMessage, errorText(error), 'error');
    postsContainer.replaceChildren(makeEmpty('Нажмите «Показать публикации» для повторной попытки.'));
  } finally {
    button.disabled = false;
    if (requestNumber === postsRequestNumber) postsContainer.setAttribute('aria-busy', 'false');
  }
}

function makeUser(user) {
  const article = document.createElement('article');
  article.className = 'user';
  const name = document.createElement('h3');
  name.textContent = user.name;
  const email = document.createElement('p');
  email.textContent = `Email: ${user.email}`;
  const city = document.createElement('p');
  city.textContent = `Город: ${user.address.city}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Показать публикации';
  button.addEventListener('click', () => loadPosts(user, button));
  article.append(name, email, city, button);
  return article;
}

function renderUsers() {
  const search = searchInput.value.trim().toLocaleLowerCase();
  const matching = allUsers.filter(user => user.name.toLocaleLowerCase().includes(search));
  if (matching.length === 0) {
    usersContainer.replaceChildren(makeEmpty('Пользователи не найдены'));
    return;
  }
  usersContainer.replaceChildren(...matching.map(makeUser));
}

loadButton.addEventListener('click', async () => {
  loadButton.disabled = true;
  usersContainer.setAttribute('aria-busy', 'true');
  showMessage(usersMessage, 'Загрузка...', 'loading');
  try {
    const data = await requestJSON(USERS_URL);
    if (!Array.isArray(data)) throw new Error('Сервер вернул неверный формат списка.');
    allUsers = data;
    renderUsers();
    showMessage(usersMessage, `Пользователи загружены: ${data.length}.`, 'success');
  } catch (error) {
    showMessage(usersMessage, errorText(error), 'error');
    if (allUsers.length === 0) usersContainer.replaceChildren(makeEmpty('Нажмите кнопку ещё раз для повторной попытки.'));
  } finally {
    loadButton.disabled = false;
    usersContainer.setAttribute('aria-busy', 'false');
  }
});

searchInput.addEventListener('input', () => {
  if (allUsers.length > 0) renderUsers();
});
