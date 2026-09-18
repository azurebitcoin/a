(function () {
  "use strict";
  var GA4_MEASUREMENT_ID = "G-8ES52L4R1P";
  // Google Ads conversion ID is not in this repository.
  // When a real conversion action exists, set it here (example format only):
  //   var GOOGLE_ADS_CONVERSION = "AW-XXXXXXXXXX/YYYY";
  // and pass send_to on conversion events. Do not invent IDs.
  var GOOGLE_ADS_CONVERSION = "";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  var analyticsStarted = false;
  function startAnalytics() {
    if (analyticsStarted) return;
    analyticsStarted = true;
    window.gtag("js", new Date());
    window.gtag("config", GA4_MEASUREMENT_ID);
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID;
    document.head.appendChild(script);
    window.dispatchEvent(new Event("andriuk-analytics-ready"));
  }

  window.andriukAnalytics = {
    measurementId: GA4_MEASUREMENT_ID,
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
    try { sessionStorage.setItem(name, value); } catch (_) {}
  }
  function storageRemove(name) {
    try { sessionStorage.removeItem(name); } catch (_) {}
  }
  function fireOnce(flagKey, eventName, params) {
    if (storageGet(flagKey) === "sent") return;
    send(eventName, params);
    storageSet(flagKey, "sent");
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

  function sendPageConversions() {
    if (!analyticsAllowed()) return;
    var conversion = document.body && document.body.getAttribute("data-conversion");
    if (conversion === "donation_complete") {
      fireOnce("andriuk_donation_complete_sent", "donation_complete", {
        payment_provider: "WayForPay"
      });
    }
    if (conversion === "generate_lead") {
      var topic = storageGet("andriuk_letter_topic") || "";
      var pending = storageGet("andriuk_lead_pending") === "1";
      if (pending) {
        fireOnce("andriuk_generate_lead_sent", "generate_lead", {
          lead_source: "contact_form",
          lead_topic: topic
        });
        fireOnce("andriuk_contact_submit_sent", "contact_submit", {
          lead_source: "contact_form",
          lead_topic: topic
        });
        if (topic === "Волонтерство та партнерство") {
          fireOnce("andriuk_volunteer_interest_sent", "volunteer_interest", {
            method: "contact_form"
          });
        }
        storageRemove("andriuk_lead_pending");
      }
    }
  }
  document.addEventListener("andriuk-analytics-ready", sendPageConversions);
  sendPageConversions();

  function bindLetterTools(preview, mail, status) {
    var copy = document.getElementById("letter-copy");
    if (copy) {
      copy.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(preview.value);
          status.textContent = "Текст скопійовано. Вставте його у лист до info@andriukfoundation.com.";
        } catch (_) {
          preview.focus();
          preview.select();
          status.textContent = "Виділено текст. Скопіюйте його через меню пристрою.";
        }
      });
    }
    var savedText = storageGet("andriuk_letter_preview");
    var savedTopic = storageGet("andriuk_letter_topic") || "Звернення до фонду";
    if (savedText && preview) {
      preview.value = savedText;
      if (mail) {
        mail.href = "mailto:info@andriukfoundation.com?subject=" + encodeURIComponent(savedTopic) + "&body=" + encodeURIComponent(savedText);
      }
      var result = document.getElementById("letter-result");
      if (result) result.hidden = false;
      if (status && !status.textContent) {
        status.textContent = "Текст підготовлено. Щоб фонд отримав звернення, надішліть лист зі своєї пошти.";
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
    var text = "Добрий день!\n\nТема: " + topic + "\nІм’я: " + data.get("sender").trim() + "\nМісто: " + data.get("city").trim() + "\nКонтакт для відповіді: " + data.get("contact").trim() + "\n\n" + data.get("message").trim();
    storageSet("andriuk_letter_preview", text);
    storageSet("andriuk_letter_topic", topic);
    storageSet("andriuk_lead_pending", "1");
    if (preview) preview.value = text;
    if (mail) mail.href = "mailto:info@andriukfoundation.com?subject=" + encodeURIComponent(topic) + "&body=" + encodeURIComponent(text);
    window.location.assign("dyakuyemo-za-zvernennya.html");
    if (result) result.hidden = false;
    if (status) status.textContent = "Текст підготовлено. Якщо сторінка подяки не відкрилася, надішліть лист зі своєї пошти.";
  });
})();

(function () {
  "use strict";
  var file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  if (!file) file = "index.html";
  if (file.indexOf(".html") === -1 && file !== "") return;
  document.querySelectorAll(".site-header [aria-current='page']").forEach(function (el) {
    /* Keep server-rendered current page; only fill gaps on alias URLs. */
  });
  document.querySelectorAll(".site-header a[href]").forEach(function (link) {
    if (link.getAttribute("href") === file) link.setAttribute("aria-current", "page");
  });
})();
