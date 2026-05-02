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
    changeLang: "Сменить язык",
    presentCondition: "Текущее состояние",
    hiddenProcesses: "Скрытые процессы"
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
    changeLang: "Change language",
    presentCondition: "Present Condition",
    hiddenProcesses: "Hidden Processes"
  }
};

let cards = [];
let currentLang = localStorage.getItem("lang") || null;
let selectedCard = null;
let isTextShown = false;
let cardSelectedAt = 0;
const CLICK_GUARD_MS = 500;

fetch("cards.json")
  .then(function(r) { return r.json(); })
  .then(function(data) { cards = data; })
  .catch(function(e) { console.error("Не удалось загрузить cards.json:", e); });

function $(id) { return document.getElementById(id); }
function t(key) { return (i18n[currentLang] && i18n[currentLang][key]) || key; }

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function(x) { x.classList.remove("active"); });
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
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

function escapeHTML(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Получаем красивое название карты — сначала смотрим contentTitle, потом title
function getCardTitle(card) {
  const ct = card.contentTitle && (card.contentTitle[currentLang] || card.contentTitle.en || card.contentTitle.ru);
  if (ct) return ct;
  return localized(card.title, "");
}

function renderDeck() {
  const track = $("coverflow-track");
  if (!track) return;
  track.innerHTML = "";

  const shuffled = [].concat(cards).sort(function() { return Math.random() - 0.5; });

  shuffled.forEach(function(card, i) {
    const el = document.createElement("div");
    el.className = "coverflow-card";
    el.dataset.index = i;

    el.addEventListener("click", function(e) {
      e.stopPropagation();
      if (el.classList.contains("is-center")) {
        flyOutAndSelect(el, card);
      } else {
        scrollToCard(el);
      }
    });

    track.appendChild(el);
  });

  initCoverflow();

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
    const norm = distance / 100;
    const absNorm = Math.abs(norm);

    const rotateY = Math.max(-65, Math.min(65, -norm * 50));
    const scale = Math.max(0.7, 1 - absNorm * 0.08);
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
  const title = getCardTitle(selectedCard);

  $("card-stage").style.display = "block";
  $("card-stage").innerHTML =
    (title ? '<div class="card-title">' + escapeHTML(title) + '</div>' : '') +
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

function isNonEmptyText(value) {
  return value != null && String(value).trim() !== "";
}

function sameText(a, b) {
  return String(a || "").trim().replace(/\s+/g, " ") === String(b || "").trim().replace(/\s+/g, " ");
}

function localizedObjectField(obj, lang) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ru || "";
}

function localizedArrayField(obj, lang) {
  const value = localizedObjectField(obj, lang);
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function renderParagraphs(arr, className) {
  const clean = (arr || []).filter(function(p) { return isNonEmptyText(p); });
  if (!clean.length) return "";

  let html = '<div class="' + className + '">';
  clean.forEach(function(p) {
    html += '<p>' + escapeHTML(p) + '</p>';
  });
  html += '</div>';
  return html;
}

function buildTextHTML() {
  const lang = currentLang;
  const card = selectedCard;
  let html = '<div class="text-content">';

  // Эпиграф — короткая цитата сверху.
  const quote = localizedObjectField(card.quote, lang);
  if (isNonEmptyText(quote)) {
    html += '<div class="text-quote">' + escapeHTML(quote) + '</div>';
  }

  // Основной вступительный текст.
  const bodyArr = localizedArrayField(card.body, lang);
  html += renderParagraphs(bodyArr, "text-body");

  // Первая выделенная цитата.
  const pullquote = localizedObjectField(card.pullquote, lang);
  if (isNonEmptyText(pullquote)) {
    html += '<div class="text-pullquote">' + escapeHTML(pullquote) + '</div>';
  }

  // Второй выделенный комментарий оракула.
  // Важно: он рендерится отдельно, а не как обычный outro.
  const oracleComment = localizedObjectField(card.oracleComment, lang);

  // Обычные финальные абзацы.
  // Убираем из outro абзац, совпадающий с oracleComment, чтобы он не дублировался.
  // Не используем класс text-outro, потому что в текущем CSS он делает все абзацы жирными.
  const outroArr = localizedArrayField(card.outro, lang).filter(function(p) {
    return isNonEmptyText(p) && !sameText(p, oracleComment);
  });
  html += renderParagraphs(outroArr, "text-body");

  if (isNonEmptyText(oracleComment)) {
    html += '<div class="text-pullquote text-oracle-comment">' + escapeHTML(oracleComment) + '</div>';
  }

  // Margins / поля.
  const m = card.margins && (card.margins[lang] || card.margins.en || card.margins.ru);
  if (m) {
    let marginsHTML = '';
    if (m.presentCondition && m.presentCondition.trim()) {
      marginsHTML += '<h4>' + t("presentCondition") + '</h4>';
      marginsHTML += '<p>' + escapeHTML(m.presentCondition) + '</p>';
    }
    if (m.hiddenProcesses && m.hiddenProcesses.length) {
      const validProcesses = m.hiddenProcesses.filter(function(item) {
        return item && item.title && item.title.trim();
      });
      if (validProcesses.length) {
        marginsHTML += '<h4>' + t("hiddenProcesses") + '</h4>';
        validProcesses.forEach(function(item) {
          marginsHTML += '<div class="margin-item"><strong>' + escapeHTML(item.title) + '</strong>';
          if (item.desc && item.desc.trim()) {
            marginsHTML += ' — ' + escapeHTML(item.desc);
          }
          marginsHTML += '</div>';
        });
      }
    }
    if (marginsHTML) {
      html += '<div class="text-margins">' + marginsHTML + '</div>';
    }
  }

  const hasStructured = isNonEmptyText(quote) ||
    bodyArr.some(isNonEmptyText) ||
    isNonEmptyText(pullquote) ||
    outroArr.some(isNonEmptyText) ||
    isNonEmptyText(oracleComment) ||
    m;

  // Если структурные поля пусты — fallback на простой text.
  if (!hasStructured) {
    const fallback = localizedObjectField(card.text, lang);
    if (fallback && fallback.trim() && fallback !== "Текст карты на русском." && fallback !== "Card text in English.") {
      html += '<p style="font-size:16px;line-height:1.55;white-space:pre-line;">' + escapeHTML(fallback) + '</p>';
    } else {
      html += '<p style="font-size:15px;color:var(--hint);text-align:center;font-style:italic;">' + (lang === "ru" ? "Текст этой карты пока не заполнен" : "Text for this card is not yet available") + '</p>';
    }
  }

  html += '<div class="text-tap-hint">' + t("tapToHide") + '</div>';
  html += '</div>';
  return html;
}

function toggleCardText() {
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

  const title = getCardTitle(selectedCard);

  if (!isTextShown) {
    isTextShown = true;
    $("card-stage").style.display = "none";

    $("text-stage").style.display = "block";
    $("text-stage").innerHTML =
      (title ? '<div class="card-title text-title-inside">' + escapeHTML(title) + '</div>' : '') +
      buildTextHTML();
    $("text-stage").addEventListener("click", toggleCardText, { once: true });

    const hint = $("card-hint");
    if (hint) hint.style.display = "none";
  } else {
    isTextShown = false;
    $("text-stage").style.display = "none";
    $("text-stage").innerHTML = '';

    $("card-stage").style.display = "block";
    $("card-stage").innerHTML =
      (title ? '<div class="card-title">' + escapeHTML(title) + '</div>' : '') +
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
