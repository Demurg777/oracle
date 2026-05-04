const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : {
  ready: function() {},
  expand: function() {},
  HapticFeedback: { impactOccurred: function() {} }
};
tg.ready();
tg.expand();

const FEEDBACK_FORM_URL = "https://forms.gle/oYKyAbjhAbviJxhFA";
const FEEDBACK_FIELDS = {
  name: "entry.1441169149",
  card: "entry.1042147433",
  text: "entry.1042147433"
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

function normalizeTextForCompare(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function sameTextBlock(a, b) {
  return normalizeTextForCompare(a) === normalizeTextForCompare(b);
}

function buildTextHTML() {
  const lang = currentLang;
  const card = selectedCard;
  let html = '<div class="text-content">';

  // эпиграф (короткая цитата сверху)
  const quote = card.quote && (card.quote[lang] || card.quote.en || card.quote.ru);
  if (quote) {
    html += '<div class="text-quote">' + escapeHTML(quote) + '</div>';
  }

  // вступительные абзацы
  const body = card.body && (card.body[lang] || card.body.en || card.body.ru);
  if (body) {
    const bodyArr = Array.isArray(body) ? body : [body];
    if (bodyArr.length && bodyArr.some(function(p) { return p && p.trim(); })) {
      html += '<div class="text-body">';
      bodyArr.forEach(function(p) {
        if (p && p.trim()) html += '<p>' + escapeHTML(p) + '</p>';
      });
      html += '</div>';
    }
  }

  // первая выделенная цитата
  const pq = card.pullquote && (card.pullquote[lang] || card.pullquote.en || card.pullquote.ru);
  if (pq && pq.trim()) {
    html += '<div class="text-pullquote">' + escapeHTML(pq) + '</div>';
  }

  // второй выделенный комментарий оракула
  const oc = card.oracleComment && (card.oracleComment[lang] || card.oracleComment.en || card.oracleComment.ru);
  let oracleCommentWasRendered = false;

  // финальные абзацы — обычным текстом.
  // Если один из абзацев outro совпадает с oracleComment, он НЕ повторяется обычным текстом,
  // а выводится на этом же месте как выделенный блок.
  const outro = card.outro && (card.outro[lang] || card.outro.en || card.outro.ru);
  if (outro) {
    const outroArr = Array.isArray(outro) ? outro : [outro];
    if (outroArr.length && outroArr.some(function(p) { return p && p.trim(); })) {
      html += '<div class="text-body">';
      outroArr.forEach(function(p) {
        if (!p || !p.trim()) return;

        if (oc && oc.trim() && sameTextBlock(p, oc)) {
          html += '</div>';
          html += '<div class="text-pullquote text-oracle-comment">' + escapeHTML(oc) + '</div>';
          html += '<div class="text-body">';
          oracleCommentWasRendered = true;
        } else {
          html += '<p>' + escapeHTML(p) + '</p>';
        }
      });
      html += '</div>';
    }
  }

  // Если oracleComment не был найден внутри outro, выводим его отдельным блоком после outro.
  // Это запасной режим для карт, где oracleComment есть, но не включён в массив outro.
  if (oc && oc.trim() && !oracleCommentWasRendered) {
    html += '<div class="text-pullquote text-oracle-comment">' + escapeHTML(oc) + '</div>';
  }

  // margins (поля)
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

  // если структурные поля пусты — fallback на простой text
  const hasStructured = (quote && quote.trim()) ||
    (body && (Array.isArray(body) ? body.some(function(p){return p && p.trim();}) : body.trim())) ||
    (pq && pq.trim()) ||
    (outro && (Array.isArray(outro) ? outro.some(function(p){return p && p.trim();}) : outro.trim())) ||
    (oc && oc.trim()) ||
    m;

  if (!hasStructured) {
    const fallback = (card.text && (card.text[lang] || card.text.en || card.text.ru)) || "";
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

    // показываем название над текстом
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

function initApp() {
  document.querySelectorAll("[data-lang]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      currentLang = btn.dataset.lang;
      localStorage.setItem("lang", currentLang);
      applyLang();
      showScreen("screen-home");
    });
  });

  const btnDraw = $("btn-draw");
  if (btnDraw) {
    btnDraw.addEventListener("click", function() {
      if (cards.length === 0) return;
      renderDeck();
      showScreen("screen-deck");
    });
  }

  const btnBackFromDeck = $("btn-back-from-deck");
  if (btnBackFromDeck) {
    btnBackFromDeck.addEventListener("click", function() {
      showScreen("screen-home");
    });
  }

  const btnChangeLang = $("btn-change-lang");
  if (btnChangeLang) {
    btnChangeLang.addEventListener("click", function() {
      showScreen("screen-lang");
    });
  }

  if (currentLang && i18n[currentLang]) {
    applyLang();
    showScreen("screen-home");
  } else {
    showScreen("screen-lang");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
