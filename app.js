const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let cards = [];
fetch("cards.json").then(r => r.json()).then(data => { cards = data; });

const screenHome = document.getElementById("screen-home");
const screenCards = document.getElementById("screen-cards");
const cardsContainer = document.getElementById("cards-container");

function showScreen(s) {
  document.querySelectorAll(".screen").forEach(x => x.classList.remove("active"));
  s.classList.add("active");
}

function pickRandom(n) {
  return [...cards].sort(() => Math.random() - 0.5).slice(0, n);
}

function renderCards(picked, titles = []) {
  cardsContainer.innerHTML = "";
  picked.forEach((card, i) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="card" data-i="${i}">
        <div class="card-inner">
          <div class="card-face card-back">✦</div>
          <div class="card-face card-front"><img src="${card.image}" alt=""></div>
        </div>
      </div>
      <div class="card-text" id="text-${i}" style="display:none">
        ${titles[i] ? `<div class="card-title">${titles[i]}</div>` : ""}
        <div>${card.text}</div>
      </div>`;
    cardsContainer.appendChild(wrap);
  });

  cardsContainer.querySelectorAll(".card").forEach(el => {
    el.addEventListener("click", () => {
      if (el.classList.contains("flipped")) return;
      el.classList.add("flipped");
      tg.HapticFeedback?.impactOccurred("medium");
      setTimeout(() => {
        document.getElementById(`text-${el.dataset.i}`).style.display = "block";
      }, 400);
    });
  });
}

document.querySelectorAll("[data-spread]").forEach(btn => {
  btn.addEventListener("click", () => {
    const n = parseInt(btn.dataset.spread);
    const titles = n === 3 ? ["Прошлое", "Настоящее", "Будущее"] : [];
    renderCards(pickRandom(n), titles);
    showScreen(screenCards);
  });
});

document.getElementById("btn-back").addEventListener("click", () => showScreen(screenHome));