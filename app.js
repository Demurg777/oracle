const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Ссылка на Google Doc для отзывов — вставьте свою!
const FEEDBACK_URL = "https://docs.google.com/document/d/1KW06KUVvQ_mjBHQn6L8IPoLtaYgHSrtnjBKz0vEGChU/edit?usp=sharing";

// Переводы интерфейса
const i18n = {
  ru: {
    title: "Метафорические карты",
    hint: "Сформулируйте вопрос и вытяните карту",
    draw: "🎴 Вытянуть карту",
    feedback: "💬 Оставить комментарий",
    changeLang: "Сменить язык",
    again: "🔄 Ещё карта",
    back: "← На главную",
    chooseLang: "Выберите язык / Choose language"
  },
  en: {
    title: "Metaphorical Cards",
    hint: "Formulate your question and draw a card",
    draw: "🎴 Draw a card",
    feedback: "💬 Leave a comment",
    changeLang: "Change language",
    again: "🔄 Another card",
    back: "← Back to home",
    chooseLang: "Выберите язык / Choose language"
  }
};

let cards = [];
let currentLang = localStorage.getItem("lang") || null;

// Загружаем карты
fetch("cards.json")
  .then(r => r.json())
  .then(data => { cards = data; });

const screenLang = document.getElementById("screen-lang");
const screenHome = document.getElementById("screen-home");
const screenCards = document.getElementById("screen-cards");
const cardsContainer = document.getElementById("cards-container");

function showScreen(s) {
  document.querySelectorAll(".screen").forEach(x => x.classList.remove("active"));
  s.classList.add("active");
  window.scrollTo(0, 0);
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[currentLang] && i18n[currentLang][key]) {
      el.textContent = i18n[currentLang][key];
    }
  });
  document.documentElement.lang = currentLang;
}

function pickRandom() {
  return cards[Math.floor(Math.random() * cards.length)];
}

function renderCard(card) {
  const text = typeof card.text === "string" ? card.text : card.text[currentLang];

  cardsContainer.innerHTML = `
    <div class="card" id="card-el">
      <div class="card-inner">
        <div class="card-face card-back">✦</div>
        <div class="card-face card-front"><img src="${card.image}" alt=""></div>
      </div>
    </div>
    <div class="card-text" id="card-text-el">${text}</div>
  `;

  const cardEl = document.getElementById("card-el");
  const textEl = document.getElementById("card-text-el");

  cardEl.addEventListener("click", () => {
    if (cardEl.classList.contains("flipped")) return;
    cardEl.classList.add("flipped");
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
    setTimeout(() => textEl.classList.add("visible"), 400);
  });
}

// Выбор языка
document.querySelectorAll("[data-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("lang", currentLang);
    applyLang();
    showScreen(screenHome);
  });
});

// Вытянуть карту
document.getElementById("btn-draw").addEventListener("click", () => {
  if (cards.length === 0) return;
  renderCard(pickRandom());
  showScreen(screenCards);
});

// Ещё карта
document.getElementById("btn-again").addEventListener("click", () => {
  renderCard(pickRandom());
});

// На главную
document.getElementById("btn-back").addEventListener("click", () => {
  showScreen(screenHome);
});

// Комментарий
document.getElementById("btn-feedback").addEventListener("click", () => {
  if (tg.openLink) {
    tg.openLink(FEEDBACK_URL);
  } else {
    window.open(FEEDBACK_URL, "_blank");
  }
});

// Сменить язык
document.getElementById("btn-change-lang").addEventListener("click", () => {
  showScreen(screenLang);
});

// Стартовый экран
if (currentLang && i18n[currentLang]) {
  applyLang();
  showScreen(screenHome);
} else {
  showScreen(screenLang);
}