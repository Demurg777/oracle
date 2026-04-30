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
  const track = $("coverflow-track");
  track.innerHTML = "";

  const shuffled = [...cards].sort(() => Math.random() - 0.5);

  shuffled.forEach(function(card, i) {
    const el = document.createElement("div");
    el.className = "coverflow-card";
    el.dataset.index = i;

    el.addEventListener("click", function(e) {
      e.stopPropagation();
      // если тап по центральной карте — выбрать; если по боковой — прокрутить к ней
      if (el.classList.contains("is-center")) {
        flyOutAndSelect(el, card);
      } else {
        scrollToCard(el);
      }
    });

    track.appendChild(el);
  });

  // запустить обновление 3D-трансформаций при прокрутке
  initCoverflow();

  // прокрутить к первой карте
  setTimeout(function() {
    const scroll = $("coverflow-scroll");
    if (scroll) scroll.scrollLeft = 0;
    updateCoverflow();
  }, 50);
}

function scrollToCard(el) {
  const scroll = $("coverflow-scroll");
  const cardCenter = el.offsetLeft + el.offsetWidth / 2;
  const targetScroll = cardCenter - scroll.clientWidth / 2;
  scroll.scrollTo({ left: targetScroll, behavior: "smooth" });
}

function initCoverflow() {
  const scroll = $("coverflow-scroll");
  if (!scroll) return;
  if (scroll.dataset.coverflowInit) return;
  scroll.dataset.coverflowInit = "1";

  scroll.addEventListener("scroll", updateCoverflow, { passive: true });
  window.addEventListener("resize", updateCoverflow);
}

function updateCoverflow() {
  const scroll = $("coverflow-scroll");
  if (!scroll) return;
  const track = $("coverflow-track");
  if (!track) return;

  const scrollCenter = scroll.scrollLeft + scroll.clientWidth / 2;
  const cardEls = track.querySelectorAll(".coverflow-card");

  cardEls.forEach(function(el) {
    const cardCenter = el.offsetLeft + el.offsetWidth / 2;
    const distance = cardCenter - scrollCenter;
    // нормализованное расстояние, где 1 ≈ ширина одной карты
    const norm = distance / 100;
    const absNorm = Math.abs(norm);

    // боковые карты — повёрнуты на 60°, центральная — 0°
    const rotateY = Math.max(-65, Math.min(65, -norm * 50));
    // карты дальше от центра — меньше и темнее
    const scale = Math.max(0.7, 1 - absNorm * 0.08);
    // боковые слегка смещены к центру по Z (визуально дальше)
    const translateZ = -Math.min(120, absNorm * 60);

    el.style.transform =
      "translateZ(" + translateZ.toFixed(0) + "px) " +
      "rotateY(" + rotateY.toFixed(1) + "deg) " +
      "scale(" + scale.toFixed(3) + ")";

    el.style.zIndex = String(1000 - Math.round(absNorm * 100));
    el.style.opacity = String(Math.max(0.4, 1 - absNorm * 0.15));

    if (absNorm < 0.4) {
      el.classList.add("is-center");
    } else {
      el.classList.remove("is-center");
    }
  });
}

function flyOutAndSelect(el, card) {
  el.classList.add("flying-out");
  el.style.transform = "translateY(-80vh) scale(1.4)";
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

function buildTextHTML() {
  const lang = currentLang;
  const card = selectedCard;
  let html = '<div class="text-content">';

  // эпиграф
  const quote = card.quote && (card.quote[lang] || card.quote.en || card.quote.ru);
  if (quote) {
    html += '<div class="text-quote">' + escapeHTML(quote) + '</div>';
  }

  // основные абзацы
  const body = card.body && (card.body[lang] || card.body.en || card.body.ru);
  if (body) {
    html += '<div class="text-body">';
    if (Array.isArray(body)) {
      body.forEach(function(p) {
        html += '<p>' + escapeHTML(p) + '</p>';
      });
    } else {
      html += '<p>' + escapeHTML(body) + '</p>';
    }
    html += '</div>';
  }

  // выделенная цитата (то, что в скобках)
  const pq = card.pullquote && (card.pullquote[lang] || card.pullquote.en || card.pullquote.ru);
  if (pq) {
    html += '<div class="text-pullquote">' + escapeHTML(pq) + '</div>';
  }

  // финальные абзацы
  const outro = card.outro && (card.outro[lang] || card.outro.en || card.outro.ru);
  if (outro) {
    html += '<div class="text-body">';
    if (Array.isArray(outro)) {
      outro.forEach(function(p) {
        html += '<p>' + escapeHTML(p) + '</p>';
      });
    } else {
      html += '<p>' + escapeHTML(outro) + '</p>';
    }
    html += '</div>';
  }

  // margins
  const m = card.margins && (card.margins[lang] || card.margins.en || card.margins.ru);
  if (m) {
    html += '<div class="text-margins">';
    if (m.presentCondition) {
      html += '<h4>' + (lang === "ru" ? "Текущее состояние" : "Present Condition") + '</h4>';
      html += '<p>' + escapeHTML(m.presentCondition) + '</p>';
    }
    if (m.hiddenProcesses && m.hiddenProcesses.length) {
      html += '<h4>' + (lang === "ru" ? "Скрытые процессы" : "Hidden Processes") + '</h4>';
      m.hiddenProcesses.forEach(function(item) {
        html += '<div class="margin-item"><strong>' + escapeHTML(item.title) + '</strong> — ' + escapeHTML(item.desc) + '</div>';
      });
    }
    html += '</div>';
  }

  // если структурных полей нет — показать просто text как раньше
  if (!quote && !body && !pq && !outro && !m) {
    const fallback = card.text && (card.text[lang] || card.text.en || card.text.ru) || "";
    html += '<p style="font-size:16px;line-height:1.55;">' + escapeHTML(fallback) + '</p>';
  }

  html += '<div class="text-tap-hint">' + t("tapToHide") + '</div>';
  html += '</div>';
  return html;
}

function escapeHTML(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toggleCardText() {
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

  const title = localized(selectedCard.title, "");

  if (!isTextShown) {
    isTextShown = true;
    $("card-stage").style.display = "none";

    $("text-stage").style.display = "block";
    $("text-stage").innerHTML = buildTextHTML();

    $("text-stage").addEventListener("click", toggleCardText, { once: true });

    const hint = $("card-hint");
    if (hint) hint.style.display = "none";
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
    if (hint) {
      hint.style.display = "block";
      hint.textContent = t("tapToReveal");
    }
  }
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
