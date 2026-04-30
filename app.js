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
    tapToReveal: "Нажмите на карту, чтобы перевернуть",
    feedbackTitle: "Поделиться впечатлением",
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
    pickHint: "Swipe the deck and pick a card",
    tapToReveal: "Tap the card to flip",
    feedbackTitle: "Share your reflection",
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
let isRevealed = false;
const DECK_SIZE = 12;

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
  isRevealed = false;
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
  renderSelectedCard();
  showScreen("screen-card");
}

function renderSelectedCard() {
  $("card-stage").innerHTML =
    '<div class="card-3d" id="card-3d">' +
      '<div class="card-face card-back">*</div>' +
      '<div class="card-face card-front"><img src="' + selectedCard.image + '" alt=""></div>' +
    '</div>';
  $("card-content").innerHTML = '<p class="hint">' + t("tapToReveal") + '</p>';
  $("card-3d").addEventListener("click", revealCard);
}

function revealCard() {
  if (isRevealed) return;
  isRevealed = true;
  $("card-3d").classList.add("flipped");
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
  setTimeout(showCardContent, 600);
}

function showCardContent() {
  const text = localized(selectedCard.text, "");
  const title = localized(selectedCard.title, "#" + selectedCard.id);
  $("card-content").innerHTML =
    '<div class="card-text">' + text + '</div>' +
    '<div class="feedback-block">' +
      '<h3>' + t("feedbackTitle") + '</h3>' +
      '<input type="text" id="fb-name" placeholder="' + t("feedbackName") + '" />' +
      '<input type="text" id="fb-card" value="' + title + '" readonly />' +
      '<textarea id="fb-text" placeholder="' + t("feedbackText") + '" rows="4"></textarea>' +
      '<button class="btn" id="fb-submit">' + t("feedbackSubmit") + '</button>' +
      '<p class="feedback-status" id="fb-status"></p>' +
    '</div>' +
    '<button class="btn" id="btn-again">' + t("again") + '</button>' +
    '<button class="btn btn-secondary" id="btn-home">' + t("home") + '</button>';
  $("fb-submit").addEventListener("click", submitFeedback);
  $("btn-again").addEventListener("click", () => {
    renderDeck();
    showScreen("screen-deck");
  });
  $("btn-home").addEventListener("click", () => showScreen("screen-home"));
}

async function submitFeedback() {
  const name = $("fb-name").value.trim();
  const ca
