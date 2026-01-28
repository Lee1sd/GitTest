// ===== Auth =====
function checkAuth() {
  const user =
    localStorage.getItem('teumsae_user') ||
    sessionStorage.getItem('teumsae_user');

  if (!user) return { isGuest: true };
  return JSON.parse(user);
}

function updateUserInfo(user) {
  const avatar = document.getElementById('user-avatar');
  const name = document.getElementById('user-name');
  if (!avatar || !name) return;

  if (user.isGuest) {
    avatar.textContent = 'G';
    name.textContent = 'Guest';
  } else {
    const initial = user.email?.charAt(0).toUpperCase() || 'U';
    avatar.textContent = initial;
    name.textContent = user.name || user.email.split('@')[0];
  }
}

function logout() {
  localStorage.removeItem('teumsae_user');
  sessionStorage.removeItem('teumsae_user');
  window.location.href = 'login.html';
}

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
  /* ---------- header ---------- */
  const user = checkAuth();
  if (user) updateUserInfo(user);

  const header = document.querySelector('.header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  /* ---------- todo ---------- */
  const addBtn = document.querySelector('.todo-add-btn');
  const todoList = document.querySelector('.todo-list');

  if (addBtn && todoList) {
    addBtn.addEventListener('click', () => {
      const item = document.createElement('div');
      item.className = 'todo-item';

      item.innerHTML = `
        <label class="todo-label">
          <input type="checkbox" />
          <input type="text" class="todo-text" placeholder="할 일을 입력하세요" />
        </label>
        <button class="planner-todo-delete">✕</button>
      `;

      item.querySelector('.planner-todo-delete').onclick = () => item.remove();
      todoList.appendChild(item);
      item.querySelector('.todo-text').focus();
    });
  }

  /* ---------- myplans panel ---------- */
  const openBtn = document.getElementById('open-myplans');
  const closeBtn = document.getElementById('close-myplans');
  const panel = document.getElementById('myplans-panel');

  if (openBtn && closeBtn && panel) {
    openBtn.onclick = () => panel.classList.add('is-open');
    closeBtn.onclick = () => panel.classList.remove('is-open');
  }
});
