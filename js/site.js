function isEnglishPage() {
  var lang = "";
  try { lang = (document.documentElement.getAttribute("lang") || "").toLowerCase(); } catch (_) {}
  return lang.indexOf("en") === 0;
}

(function () {
  "use strict";
  var GA4_MEASUREMENT_ID = "G-8ES52L4R1P";
  var GOOGLE_ADS_ID = "AW-18467119985";
  // Purchase («Покупка») is a static page-load snippet on thank-you.html and
  // dyakuyemo-za-pidtrymku.html only (send_to AW-18467119985/lF7tCIShz4EdEPHG5-VE).
  // Leave this empty so send() does not attach that send_to to other events
  // or fire the purchase conversion a second time from donation_complete.
  var GOOGLE_ADS_CONVERSION = "";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function staticGtagPresent() {
    var needle = "googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID;
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var raw = scripts[i].getAttribute("src") || "";
      var abs = scripts[i].src || "";
      if (raw.indexOf(needle) !== -1 || abs.indexOf(needle) !== -1) return true;
    }
    return false;
  }

  // Pages include a static Consent Mode snippet in <head> so Google Ads can
  // see the tag in view-source. Do not append a second gtag.js or send a
  // second config when that snippet is already there. Fallback covers any
  // page that still loads this file without the static tag.
  if (!staticGtagPresent()) {
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500
    });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID;
    (document.head || document.documentElement).appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", GA4_MEASUREMENT_ID);
    window.gtag("config", GOOGLE_ADS_ID);
  }

  window.andriukAnalytics = {
    measurementId: GA4_MEASUREMENT_ID,
    adsId: GOOGLE_ADS_ID,
    adsConversion: GOOGLE_ADS_CONVERSION,
    allowed: function () {
      try { return localStorage.getItem("andriuk_cookie_consent") === "granted"; } catch (_) { return false; }
    },
    send: function (name, params) {
      if (!window.andriukAnalytics.allowed() || typeof window.gtag !== "function") return;
      var payload = params ? Object.assign({}, params) : {};
      if (GOOGLE_ADS_CONVERSION && GOOGLE_ADS_CONVERSION.indexOf("AW-XXXXXXXXXX") === -1) {
        payload.send_to = GOOGLE_ADS_CONVERSION;
      }
      window.gtag("event", name, payload);
    }
  };

  var key = "andriuk_cookie_consent";
  var banner = document.getElementById("cookie-consent-banner");
  var settings = document.getElementById("cookie-settings");
  function showBanner(show) {
    if (banner) banner.style.display = show ? "block" : "none";
    if (settings) settings.style.display = show ? "none" : "block";
  }
  // Donation thank-you pages queue the Purchase conversion under a granted
  // ad_storage / ad_user_data default (wait_for_update 500). A consent update
  // that denies those types inside that window drops the hit.
  function donationThankYouPage() {
    var path = "";
    try { path = window.location.pathname || ""; } catch (_) {}
    return path.indexOf("thank-you.html") !== -1 || path.indexOf("dyakuyemo-za-pidtrymku.html") !== -1;
  }
  function choose(choice) {
    var storage = choice === "granted" ? "granted" : "denied";
    var update = {
      analytics_storage: storage,
      ad_personalization: storage
    };
    if (!(donationThankYouPage() && storage === "denied")) {
      update.ad_storage = storage;
      update.ad_user_data = storage;
    }
    window.gtag("consent", "update", update);
    try { localStorage.setItem(key, choice); } catch (_) {}
    if (choice === "granted") window.dispatchEvent(new Event("andriuk-analytics-ready"));
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
    status.textContent = isEnglishPage()
      ? "Loading posts. If the feed does not appear, open Instagram using the link above."
      : "Завантажуємо публікації. Якщо стрічка не з’явиться, відкрийте Instagram за посиланням вище.";
    var script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    script.onerror = function () {
      status.textContent = isEnglishPage()
        ? "The feed could not be loaded. The posts are available on the foundation’s Instagram page."
        : "Не вдалося завантажити стрічку. Публікації доступні за прямим посиланням на Instagram.";
    };
    document.body.appendChild(script);
  }, { once: true });
})();

(function () {
  "use strict";
  var analytics = window.andriukAnalytics;
  function send(name, params) {
    if (analytics && typeof analytics.send === "function") analytics.send(name, params);
  }
  function analyticsAllowed() {
    return analytics && analytics.allowed ? analytics.allowed() : false;
  }
  function storageGet(name) {
    try { return sessionStorage.getItem(name); } catch (_) { return null; }
  }
  function storageSet(name, value) {
    try {
      sessionStorage.setItem(name, value);
      return sessionStorage.getItem(name) === value;
    } catch (_) { return false; }
  }
  function storageRemove(name) {
    try { sessionStorage.removeItem(name); } catch (_) {}
  }
  function fireOnce(flagKey, eventName, params) {
    if (storageGet(flagKey) === "sent") return;
    send(eventName, params);
    storageSet(flagKey, "sent");
  }

  var preparedPendingKey = "andriuk_letter_prepared_pending";
  var preparedInMemory = false;
  var letterTopic = storageGet("andriuk_letter_topic") || "";
  // Only fixed category codes reach analytics, never arbitrary form or storage values.
  var topicCodes = {
    "Допомога військовим": "military_aid", "Military aid": "military_aid",
    "Стоматологія для військових": "military_dental", "Dental care for service members": "military_dental",
    "Допомога дітям": "children", "Help for children": "children",
    "Допомога переселенцям": "displaced_people", "Help for displaced people": "displaced_people",
    "Допомога лікарням": "hospitals", "Help for hospitals": "hospitals",
    "Допомога тваринам": "animals", "Help for animals": "animals",
    "Волонтерство та партнерство": "volunteering", "Volunteering and partnership": "volunteering",
    "Запит щодо звітності": "reporting", "Reporting request": "reporting",
    "Інше питання": "other", "Other question": "other"
  };
  function sendLetterAction(name) {
    send(name, {
      contact_source: "letter_form",
      contact_language: isEnglishPage() ? "en" : "uk",
      contact_topic: Object.prototype.hasOwnProperty.call(topicCodes, letterTopic) ? topicCodes[letterTopic] : "other"
    });
  }
  function sendLetterPrepared() {
    if (!analyticsAllowed()) return;
    var preparedPage = document.body && document.body.getAttribute("data-contact-step") === "prepared";
    if (!preparedInMemory && !(preparedPage && storageGet(preparedPendingKey) === "1" && storageGet("andriuk_letter_preview"))) return;
    sendLetterAction("contact_letter_prepared");
    preparedInMemory = false;
    storageRemove(preparedPendingKey);
  }

  // Old pending leads must never be replayed as new preparations or receipts.
  storageRemove("andriuk_lead_pending");

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link || !analyticsAllowed() || typeof window.gtag !== "function") return;
    var href = link.getAttribute("href");
    var method = href.indexOf("tel:") === 0 ? "phone" : href.indexOf("mailto:") === 0 ? "email" : "";
    if (method && link.id !== "letter-open") window.gtag("event", "contact_click", { contact_method: method });
    if (href.indexOf("https://secure.wayforpay.com/donate/") === 0) window.gtag("event", "donation_click", { payment_provider: "WayForPay" });
    // A click is not a completed donation or a confirmed lead. Never send letter contents to analytics.
  });

  function sendPageConversions() {
    if (!analyticsAllowed()) return;
    var conversion = document.body && document.body.getAttribute("data-conversion");
    if (conversion === "donation_complete") {
      fireOnce("andriuk_donation_complete_sent", "donation_complete", {
        payment_provider: "WayForPay"
      });
    }
    // Preparing a letter, visiting this page or opening mail cannot confirm receipt.
    // generate_lead must only come from a future verified server/mailbox integration.
    sendLetterPrepared();
  }
  window.addEventListener("andriuk-analytics-ready", sendPageConversions);
  sendPageConversions();

  function bindLetterTools(preview, mail, status) {
    mail.addEventListener("click", function (event) {
      if (!preview.value) return;
      event.preventDefault();
      sendLetterAction("contact_send_intent");
      status.textContent = isEnglishPage()
        ? "Send the message in your email app. This website cannot confirm sending or receipt."
        : "Надішліть повідомлення у поштовій програмі. Сайт не може підтвердити надсилання чи отримання.";
      // Keep personal data out of the DOM href and automatic link_url tracking.
      window.location.assign("mailto:info@andriukfoundation.com?subject=" + encodeURIComponent(letterTopic) + "&body=" + encodeURIComponent(preview.value));
    });
    var copy = document.getElementById("letter-copy");
    if (copy) {
      copy.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(preview.value);
          sendLetterAction("contact_letter_copied");
          status.textContent = isEnglishPage()
            ? "Text copied. Paste it into an email to info@andriukfoundation.com."
            : "Текст скопійовано. Вставте його у лист до info@andriukfoundation.com.";
        } catch (_) {
          preview.focus();
          preview.select();
          status.textContent = isEnglishPage()
            ? "The text is selected. Copy it from your device menu."
            : "Виділено текст. Скопіюйте його через меню пристрою.";
        }
      });
    }
    var savedText = storageGet("andriuk_letter_preview");
    if (savedText && preview) {
      preview.value = savedText;
      var result = document.getElementById("letter-result");
      if (result) result.hidden = false;
      if (status && !status.textContent) {
        status.textContent = isEnglishPage()
          ? "The text is ready. Send the email from your own mailbox so the foundation receives it."
          : "Текст підготовлено. Щоб фонд отримав звернення, надішліть лист зі своєї пошти.";
      }
    }
  }

  var form = document.getElementById("letter-form");
  var preview = document.getElementById("letter-preview");
  var mail = document.getElementById("letter-open");
  var status = document.getElementById("letter-status");
  if (preview && mail && status) bindLetterTools(preview, mail, status);
  if (!form) return;
  var result = document.getElementById("letter-result");
  form.hidden = false;
  form.addEventListener("input", function () {
    if (result) result.hidden = true;
    if (status) status.textContent = "";
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var data = new FormData(form);
    var topic = String(data.get("topic") || "");
    var text = isEnglishPage()
      ? "Hello,\n\nTopic: " + topic + "\nName: " + data.get("sender").trim() + "\nCity: " + data.get("city").trim() + "\nReply contact: " + data.get("contact").trim() + "\n\n" + data.get("message").trim()
      : "Добрий день!\n\nТема: " + topic + "\nІм’я: " + data.get("sender").trim() + "\nМісто: " + data.get("city").trim() + "\nКонтакт для відповіді: " + data.get("contact").trim() + "\n\n" + data.get("message").trim();
    letterTopic = topic;
    storageRemove(preparedPendingKey);
    var textSaved = storageSet("andriuk_letter_preview", text);
    var topicSaved = storageSet("andriuk_letter_topic", topic);
    var draftSaved = textSaved && topicSaved && storageSet(preparedPendingKey, "1");
    if (preview) preview.value = text;
    if (result) result.hidden = false;
    if (status) status.textContent = isEnglishPage()
      ? "The text is ready. The letter has not been sent. Send it from your own email."
      : "Текст підготовлено. Лист ще не надіслано. Надішліть його зі своєї пошти.";
    if (draftSaved) {
      try {
        window.location.assign(isEnglishPage() ? "/en/dyakuyemo-za-zvernennya.html" : "/dyakuyemo-za-zvernennya.html");
        return;
      } catch (_) {}
    }
    // If session storage or navigation fails, retain the usable draft on this page.
    if (!textSaved || !topicSaved) {
      storageRemove("andriuk_letter_preview");
      storageRemove("andriuk_letter_topic");
    }
    storageRemove(preparedPendingKey);
    preparedInMemory = true;
    sendLetterPrepared();
  });
})();

(function () {
  "use strict";
  var file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  if (!file) file = "index.html";
  if (file.indexOf(".html") === -1 && file !== "") return;
  // Home links are "/" and "/en/", not index.html. Empty pathnames still resolve to index.html above.
  var homeHref = file === "index.html" ? (isEnglishPage() ? "/en/" : "/") : "";
  document.querySelectorAll(".site-header [aria-current='page']").forEach(function (el) {
    /* Keep server-rendered current page; only fill gaps on alias URLs. */
  });
  document.querySelectorAll(".site-header a[href]").forEach(function (link) {
    var href = link.getAttribute("href");
    var inLang = link.closest && link.closest(".site-lang");
    if (href === file || (homeHref && href === homeHref && !inLang)) link.setAttribute("aria-current", "page");
  });
})();

(function () {
  "use strict";
  document.addEventListener("play", function (event) {
    if (!event.target || event.target.tagName !== "VIDEO") return;
    document.querySelectorAll("video").forEach(function (video) {
      if (video !== event.target) video.pause();
    });
  }, true);
})();

