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
    pickHint: "Проведите по колоде и выберите карту",
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
    pickHint: "Swipe through the deck and pick a card",
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
  const strip = $("deck-strip");
  strip.innerHTML = "";

  const shuffled = [...cards].sort(() => Math.random() - 0.5);

  shuffled.forEach(function(card, i) {
    const el = document.createElement("div");
    el.className = "deck-card";
    el.style.zIndex = i;
    // лёгкий случайный наклон, чтобы выглядело живо
    const rotation = (Math.random() - 0.5) * 6;
    el.style.transform = "rotate(" + rotation.toFixed(2) + "deg)";
    el.dataset.baseRotation = rotation.toFixed(2);
    el.style.animationDelay = (i * 20) + "ms";

    el.addEventListener("click", function(e) {
      e.stopPropagation();
      flyOutAndSelect(el, card);
    });

    strip.appendChild(el);
  });

  // прокрутить колоду к началу-середине
  setTimeout(function() {
    const scroll = $("deck-scroll");
    if (scroll) scroll.scrollLeft = scroll.scrollWidth / 4;
  }, 100);
}

function flyOutAndSelect(el, card) {
  el.classList.add("flying-out");
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
  setTimeout(function() {
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
  const title = localized(selectedCard.title, "");

  $("card-stage").style.display = "block";
  $("card-stage").innerHTML =
    (title ? '<div class="card-title">' + title + '</div>' : '') +
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

  $("fb-card").value = title || ("#" + selectedCard.id);

  $("card-image").addEventListener("click", handleCardClick);

  $("btn-show-feedback").addEventListener("click", function() {
    $("feedback-wrapper").style.display = "block";
    $("btn-show-feedback").style.display = "none";
    $("fb-name").focus();
  });

  $("fb-submit").addEventListener("click", submitFeedback);
  $("btn-again").addEventListener("click", function() {
    renderDeck();
    showScreen("screen-deck");
  });
  $("btn-home").addEventListener("click", function() {
    showScreen("screen-home");
  });
}

function toggleCardText() {
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

  const title = localized(selectedCard.title, "");

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
      (title ? '<div class="card-title">' + title + '</div>' : '') +
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

document.querySelectorAll("[data-lang]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    currentLang = btn.dataset.lang;
    localStorage.setItem("lang", currentLang);
    applyLang();
    showScreen("screen-home");
  });
});

$("btn-draw").addEventListener("click", function() {
  if (cards.length === 0) return;
  renderDeck();
  showScreen("screen-deck");
});

$("btn-back-from-deck").addEventListener("click", function() {
  showScreen("screen-home");
});

$("btn-change-lang").addEventListener("click", function() {
  showScreen("screen-lang");
});

if (currentLang && i18n[currentLang]) {
  applyLang();
  showScreen("screen-home");
} else {
  showScreen("screen-lang");
}
