(function () {
  "use strict";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "denied", ad_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied"
  });
  var analyticsStarted = false;
  function startAnalytics() {
    if (analyticsStarted) return;
    analyticsStarted = true;
    window.gtag("js", new Date());
    window.gtag("config", "G-8ES52L4R1P");
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-8ES52L4R1P";
    document.head.appendChild(script);
  }
  var key = "andriuk_cookie_consent";
  var banner = document.getElementById("cookie-consent-banner");
  var settings = document.getElementById("cookie-settings");
  function showBanner(show) {
    if (banner) banner.style.display = show ? "block" : "none";
    if (settings) settings.style.display = show ? "none" : "block";
  }
  function choose(choice) {
    window.gtag("consent", "update", {
      analytics_storage: choice, ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    try { localStorage.setItem(key, choice); } catch (_) {}
    if (choice === "granted") startAnalytics();
    showBanner(false);
  }
  var accept = document.getElementById("cookie-accept");
  var reject = document.getElementById("cookie-reject");
  if (accept) accept.addEventListener("click", function () { choose("granted"); });
  if (reject) reject.addEventListener("click", function () { choose("denied"); });
  if (settings) settings.addEventListener("click", function () { showBanner(true); });
  var saved = null;
  try { saved = localStorage.getItem(key); } catch (_) {}
  if (saved === "granted" || saved === "denied") choose(saved);
  else showBanner(true);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".site-header details[open]").forEach(function (details) {
      details.open = false;
      details.querySelector("summary").focus();
    });
  });
  var loadFeed = document.getElementById("load-instagram-feed");
  if (loadFeed) loadFeed.addEventListener("click", function () {
    var feed = document.getElementById("instagram-feed");
    var status = document.getElementById("instagram-status");
    feed.hidden = false;
    loadFeed.disabled = true;
    status.textContent = "Завантажуємо публікації. Якщо стрічка не з’явиться, відкрийте Instagram за посиланням вище.";
    var script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    script.onerror = function () {
      status.textContent = "Не вдалося завантажити стрічку. Публікації доступні за прямим посиланням на Instagram.";
    };
    document.body.appendChild(script);
  }, { once: true });
})();

(function () {
  "use strict";
  function analyticsAllowed() {
    try { return localStorage.getItem("andriuk_cookie_consent") === "granted"; } catch (_) { return false; }
  }
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link || !analyticsAllowed() || typeof window.gtag !== "function") return;
    var href = link.getAttribute("href");
    var method = href.indexOf("tel:") === 0 ? "phone" : href.indexOf("mailto:") === 0 ? "email" : "";
    if (method) window.gtag("event", "contact_click", { contact_method: method });
    if (href.indexOf("https://secure.wayforpay.com/donate/") === 0) window.gtag("event", "donation_click", { payment_provider: "WayForPay" });
    // A click is not a completed donation or a confirmed lead. Never send letter contents to analytics.
  });
  var form = document.getElementById("letter-form");
  if (!form) return;
  var result = document.getElementById("letter-result");
  var preview = document.getElementById("letter-preview");
  var mail = document.getElementById("letter-open");
  var status = document.getElementById("letter-status");
  form.hidden = false;
  form.addEventListener("input", function () { result.hidden = true; status.textContent = ""; });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var data = new FormData(form);
    var text = "Добрий день!\n\nТема: " + data.get("topic") + "\nІм’я: " + data.get("sender").trim() + "\nМісто: " + data.get("city").trim() + "\nКонтакт для відповіді: " + data.get("contact").trim() + "\n\n" + data.get("message").trim();
    preview.value = text;
    mail.href = "mailto:info@andriukfoundation.com?subject=" + encodeURIComponent(data.get("topic")) + "&body=" + encodeURIComponent(text);
    result.hidden = false;
    status.textContent = "Текст підготовлено. Щоб фонд отримав звернення, надішліть лист зі своєї пошти.";
    result.scrollIntoView({ block: "start", behavior: "auto" });
  });
  document.getElementById("letter-copy").addEventListener("click", async function () {
    try { await navigator.clipboard.writeText(preview.value); status.textContent = "Текст скопійовано. Вставте його у лист до info@andriukfoundation.com."; }
    catch (_) { preview.focus(); preview.select(); status.textContent = "Виділено текст. Скопіюйте його через меню пристрою."; }
  });
})();
