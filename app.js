const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/ВАШ_ID/formResponse";
const FEEDBACK_FIELDS = {
  name: "entry.0000000000",
  card: "entry.0000000000",
  text: "entry.0000000000"
};

const i18n = {
  ru: {
    title: "Метафорические карты",
    hint: "Сформулируйте вопрос и начните",
    draw: "Начать",
    pickHint: "Проведите по вееру и выберите карту",
    tapToReveal: "Нажмите на карту, чтобы увидеть текст",
    tapToHide: "Нажмите ещё раз, чтобы вернуть карту",
    feedbackTitle: "Поделиться впечатлением",
    openFeedback: "Оставить комментарий",
    feedbackName: "Ваше имя",
    feedbackText: "Что эта карта значит для вас?",
    feedbackSubmit: "Отправить",
    feedbackThanks: "Спасибо за отзыв",
    feedbackError: "Не удалось отправить, попробуйте ещё раз",
    again: "Ещё карта",
    back: "Назад",
    home: "На главную",
    changeLang: "Сменить язык"
  },
  en: {
    title: "Metaphorical Cards",
    hint: "Formulate your question and begin",
    draw: "Begin",
    pickHint: "Swipe across the fan and pick a card",
    tapToReveal: "Tap the card to see the text",
    tapToHide: "Tap again to bring the card back",
    feedbackTitle: "Share your reflection",
    openFeedback: "Leave a comment",
    feedbackName: "Your name",
    feedbackText: "What does this card mean to you?",
    feedbackSubmit: "Send",
    feedbackThanks: "Thank you",
    feedbackError: "Could not send, please try again",
    again: "Another card",
    back: "Back",
    home: "Home",
    changeLang: "Change language"
  }
};

let cards = [];
let currentLang = localStorage.getItem("lang") || null;
let selectedCard = null;
let isTextShown = false;
let cardSelectedAt = 0;
const DECK_SIZE = 18;
const CLICK_GUARD_MS = 500;

fetch("cards.json")
  .then(r => r.json())
  .then(data => { cards = data; })
  .catch(e => console.error("Не удалось загрузить cards.json:", e));

const $ = id => document.getElementById(id);
const t = key => (i18n[currentLang] && i18n[currentLang][key]) || key;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[currentLang] && i18n[currentLang][key]) {
      el.textContent = i18n[currentLang][key];
    }
  });
}

function localized(field, fallback) {
  if (!field) return fallback;
  if (typeof field === "string") return field;
  return field[currentLang] || field.ru || field.en || fallback;
}

// === Веер ===
function renderFan() {
  const container = $("fan-container");
  container.innerHTML = "";

  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const deckCards = shuffled.slice(0, Math.min(DECK_SIZE, shuffled.length));
  const total = deckCards.length;

  // Параметры веера
  const fanAngle = 80; // общий угол раскрытия в градусах
  const radius = 320; // радиус, на котором лежат карты
  const centerY = 100; // отступ от низа контейнера
  const startAngle = -fanAngle / 2;
  const step = total > 1 ? fanAngle / (total - 1) : 0;

  deckCards.forEach((card, i) => {
    const angle = startAngle + step * i;
    const el = document.createElement("div");
    el.className = "fan-card";
    el.style.transform = `translateY(${centerY}px) rotate(${angle}deg) translateY(-${radius}px)`;
    el.style.zIndex = i;

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      flyOutAndSelect(el, card);
    });

    container.appendChild(el);

    // плавное появление с задержкой по очереди
    setTimeout(() => {
      el.classList.add("appeared");
    }, 60 * i);
  });

  // эффект «карта приподнимается под пальцем»
  attachHoverEffect(container);
}

function attachHoverEffect(container) {
  let activeCard = null;

  function findCard(x, y) {
    const el = document.elementFromPoint(x, y);
    if (el && el.classList && el.classList.contains("fan-card")) return el;
    return null;
  }

  function lift(card) {
    if (activeCard === card) return;
    if (activeCard) activeCard.style.transform = activeCard.dataset.baseTransform;
    if (card) {
      if (!card.dataset.baseTransform) card.dataset.baseTransform = card.style.transform;
      card.style.transform = card.dataset.baseTransform + " translateY(-30px) scale(1.05)";
      if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged && tg.HapticFeedback.selectionChanged();
    }
    activeCard = card;
  }

  container.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    lift(findCard(touch.clientX, touch.clientY));
  });

  container.addEventListener("touchend", () => {
    if (activeCard) activeCard.style.transform = activeCard.dataset.baseTransform;
    activeCard = null;
  });

  container.addEventListener("mousemove", (e) => {
    lift(findCard(e.clientX, e.clientY));
  });

  container.addEventListener("mouseleave", () => {
    if (activeCard) activeCard.style.transform = activeCard.dataset.baseTransform;
    activeCard = null;
  });

  // сохраняем базовый трансформ всех карт
  setTimeout(() => {
    container.querySelectorAll(".fan-card").forEach(c => {
      if (!c.dataset.baseTransform) c.dataset.baseTransform = c.style.transform;
    });
  }, 50);
}

function flyOutAndSelect(el, card) {
  // карта улетает к центру
  el.classList.add("flying-out");
  el.style.transform = "translateY(-50vh) rotate(0deg) scale(1.4)";
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

  setTimeout(() => {
    selectCard(card);
  }, 500);
}

function selectCard(card) {
  selectedCard = card;
  isTextShown = false;
  cardSelectedAt = Date.now();
  renderCardScreen();
  showScreen("screen-card");
}

function handleCardClick() {
  if (Date.now() - cardSelectedAt < CLICK_GUARD_MS) return;
  toggleCardText();
}

function renderCardScreen() {
  $("card-stage").style.display = "block";
  $("card-stage").innerHTML =
    '<div class="card-image" id="card-image">' +
      '<img src="' + selectedCard.image + '" alt="">' +
    '</div>';

  $("text-stage").style.display = "none";
  $("text-stage").innerHTML = '';

  $("card-content").innerHTML =
    '<p class="hint" id="card-hint">' + t("tapToReveal") + '</p>' +
    '<button class="btn btn-secondary" id="btn-show-feedback">' + t("openFeedback") + '</button>' +
    '<div id="feedback-wrapper" style="display:none;">' +
      '<div class="feedback-block">' +
        '<h3>' + t("feedbackTitle") + '</h3>' +
        '<input type="text" id="fb-name" placeholder="' + t("feedbackName") + '" />' +
        '<input type="text" id="fb-card" readonly />' +
        '<textarea id="fb-text" placeholder="' + t("feedbackText") + '" rows="4"></textarea>' +
        '<button class="btn" id="fb-submit">' + t("feedbackSubmit") + '</button>' +
        '<p class="feedback-status" id="fb-status"></p>' +
      '</div>' +
    '</div>' +
    '<button class="btn" id="btn-again">' + t("again") + '</button>' +
    '<button class="btn btn-secondary" id="btn-home">' + t("home") + '</button>';

  const title = localized(selectedCard.title, "#" + selectedCard.id);
  $("fb-card").value = title;

  $("card-image").addEventListener("click", handleCardClick);

  $("btn-show-feedback").addEventListener("click", () => {
    $("feedback-wrapper").style.display = "block";
    $("btn-show-feedback").style.display = "none";
    $("fb-name").focus();
  });

  $("fb-submit").addEventListener("click", submitFeedback);
  $("btn-again").addEventListener("click", () => {
    renderFan();
    showScreen("screen-deck");
  });
  $("btn-home").addEventListener("click", () => showScreen("screen-home"));
}

function toggleCardText() {
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

  if (!isTextShown) {
    isTextShown = true;
    $("card-stage").style.display = "none";

    const text = localized(selectedCard.text, "");
    $("text-stage").style.display = "flex";
    $("text-stage").innerHTML = '<div class="revealed-text" id="revealed-text">' + text + '</div>';

    $("text-stage").addEventListener("click", toggleCardText, { once: true });

    const hint = $("card-hint");
    if (hint) hint.textContent = t("tapToHide");
  } else {
    isTextShown = false;
    $("text-stage").style.display = "none";
    $("text-stage").innerHTML = '';

    $("card-stage").style.display = "block";
    $("card-stage").innerHTML =
      '<div class="card-image" id="card-image">' +
        '<img src="' + selectedCard.image + '" alt="">' +
      '</div>';

    $("card-image").addEventListener("click", toggleCardText);

    const hint = $("card-hint");
    if (hint) hint.textContent = t("tapToReveal");
  }
}

async function submitFeedback() {
  const name = $("fb-name").value.trim();
  const card = $("fb-card").value;
  const text = $("fb-text").value.trim();
  const status = $("fb-status");
  if (!text) { status.textContent = "..."; return; }
  status.textContent = "...";
  const fd = new FormData();
  fd.append(FEEDBACK_FIELDS.name, name);
  fd.append(FEEDBACK_FIELDS.card, card);
  fd.append(FEEDBACK_FIELDS.text, text);
  try {
    await fetch(FEEDBACK_FORM_URL, { method: "POST", body: fd, mode: "no-cors" });
    status.textContent = t("feedbackThanks");
    $("fb-name").value = "";
    $("fb-text").value = "";
  } catch (e) {
    status.textContent = t("feedbackError");
  }
}

document.querySelectorAll("[data-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("lang", currentLang);
    applyLang();
    showScreen("screen-home");
  });
});

$("btn-draw").addEventListener("click", () => {
  if (cards.length === 0) return;
  renderFan();
  showScreen("screen-deck");
});

$("btn-back-from-deck").addEventListener("click", () => showScreen("screen-home"));
$("btn-change-lang").addEventListener("click", () => showScreen("screen-lang"));

if (currentLang && i18n[currentLang]) {
  applyLang();
  showScreen("screen-home");
} else {
  showScreen("screen-lang");
}    tapToReveal: "Tap the card to see the text",
    tapToHide: "Tap again to bring the card back",
    feedbackTitle: "Share your reflection",
    openFeedback: "Leave a comment",
    feedbackName: "Your name",
    feedbackText: "What does this card mean to you?",
    feedbackSubmit: "Send",
    feedbackThanks: "Thank you",
    feedbackError: "Could not send, please try again",
    again: "Another card",
    back: "Back",
    home: "Home",
    changeLang: "Change language"
  }
};

let cards = [];
let currentLang = localStorage.getItem("lang") || null;
let selectedCard = null;
let isTextShown = false;
let cardSelectedAt = 0;
const DECK_SIZE = 12;
const CLICK_GUARD_MS = 500;

fetch("cards.json")
  .then(r => r.json())
  .then(data => { cards = data; })
  .catch(e => console.error("Не удалось загрузить cards.json:", e));

const $ = id => document.getElementById(id);
const t = key => (i18n[currentLang] && i18n[currentLang][key]) || key;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[currentLang] && i18n[currentLang][key]) {
      el.textContent = i18n[currentLang][key];
    }
  });
}

function localized(field, fallback) {
  if (!field) return fallback;
  if (typeof field === "string") return field;
  return field[currentLang] || field.ru || field.en || fallback;
}

function renderDeck() {
  const track = $("deck-track");
  track.innerHTML = "";
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const deckCards = shuffled.slice(0, Math.min(DECK_SIZE, shuffled.length));
  deckCards.forEach(card => {
    const el = document.createElement("div");
    el.className = "deck-card";
    el.textContent = "*";
    el.addEventListener("click", () => selectCard(card));
    track.appendChild(el);
  });
  setTimeout(() => {
    const c = $("deck-container");
    c.scrollLeft = (track.scrollWidth - c.clientWidth) / 2;
  }, 50);
}

function selectCard(card) {
  selectedCard = card;
  isTextShown = false;
  cardSelectedAt = Date.now();
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
  renderCardScreen();
  showScreen("screen-card");
}

function handleCardClick(e) {
  // защита от «призрачного клика», прилетевшего сразу после выбора карты в колоде
  if (Date.now() - cardSelectedAt < CLICK_GUARD_MS) return;
  toggleCardText();
}

function renderCardScreen() {
  $("card-stage").style.display = "block";
  $("card-stage").innerHTML =
    '<div class="card-image" id="card-image">' +
      '<img src="' + selectedCard.image + '" alt="">' +
    '</div>';

  $("text-stage").style.display = "none";
  $("text-stage").innerHTML = '';

  $("card-content").innerHTML =
    '<p class="hint" id="card-hint">' + t("tapToReveal") + '</p>' +
    '<button class="btn btn-secondary" id="btn-show-feedback">' + t("openFeedback") + '</button>' +
    '<div id="feedback-wrapper" style="display:none;">' +
      '<div class="feedback-block">' +
        '<h3>' + t("feedbackTitle") + '</h3>' +
        '<input type="text" id="fb-name" placeholder="' + t("feedbackName") + '" />' +
        '<input type="text" id="fb-card" readonly />' +
        '<textarea id="fb-text" placeholder="' + t("feedbackText") + '" rows="4"></textarea>' +
        '<button class="btn" id="fb-submit">' + t("feedbackSubmit") + '</button>' +
        '<p class="feedback-status" id="fb-status"></p>' +
      '</div>' +
    '</div>' +
    '<button class="btn" id="btn-again">' + t("again") + '</button>' +
    '<button class="btn btn-secondary" id="btn-home">' + t("home") + '</button>';

  const title = localized(selectedCard.title, "#" + selectedCard.id);
  $("fb-card").value = title;

  // обработчик навешиваем сразу, без задержки — защита от призрака внутри handleCardClick
  $("card-image").addEventListener("click", handleCardClick);

  $("btn-show-feedback").addEventListener("click", () => {
    $("feedback-wrapper").style.display = "block";
    $("btn-show-feedback").style.display = "none";
    $("fb-name").focus();
  });

  $("fb-submit").addEventListener("click", submitFeedback);
  $("btn-again").addEventListener("click", () => {
    renderDeck();
    showScreen("screen-deck");
  });
  $("btn-home").addEventListener("click", () => showScreen("screen-home"));
}

function toggleCardText() {
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

  if (!isTextShown) {
    isTextShown = true;
    $("card-stage").style.display = "none";

    const text = localized(selectedCard.text, "");
    $("text-stage").style.display = "flex";
    $("text-stage").innerHTML = '<div class="revealed-text" id="revealed-text">' + text + '</div>';

    $("revealed-text").addEventListener("click", toggleCardText);

    const hint = $("card-hint");
    if (hint) hint.textContent = t("tapToHide");
  } else {
    isTextShown = false;
    $("text-stage").style.display = "none";
    $("text-stage").innerHTML = '';

    $("card-stage").style.display = "block";
    $("card-stage").innerHTML =
      '<div class="card-image" id="card-image">' +
        '<img src="' + selectedCard.image + '" alt="">' +
      '</div>';

    $("card-image").addEventListener("click", toggleCardText);

    const hint = $("card-hint");
    if (hint) hint.textContent = t("tapToReveal");
  }
}

async function submitFeedback() {
  const name = $("fb-name").value.trim();
  const card = $("fb-card").value;
  const text = $("fb-text").value.trim();
  const status = $("fb-status");
  if (!text) { status.textContent = "..."; return; }
  status.textContent = "...";
  const fd = new FormData();
  fd.append(FEEDBACK_FIELDS.name, name);
  fd.append(FEEDBACK_FIELDS.card, card);
  fd.append(FEEDBACK_FIELDS.text, text);
  try {
    await fetch(FEEDBACK_FORM_URL, { method: "POST", body: fd, mode: "no-cors" });
    status.textContent = t("feedbackThanks");
    $("fb-name").value = "";
    $("fb-text").value = "";
  } catch (e) {
    status.textContent = t("feedbackError");
  }
}

document.querySelectorAll("[data-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("lang", currentLang);
    applyLang();
    showScreen("screen-home");
  });
});

$("btn-draw").addEventListener("click", () => {
  if (cards.length === 0) return;
  renderDeck();
  showScreen("screen-deck");
});

$("btn-back-from-deck").addEventListener("click", () => showScreen("screen-home"));
$("btn-change-lang").addEventListener("click", () => showScreen("screen-lang"));

if (currentLang && i18n[currentLang]) {
  applyLang();
  showScreen("screen-home");
} else {
  showScreen("screen-lang");
}
