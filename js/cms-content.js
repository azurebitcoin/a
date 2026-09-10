(function () {
  "use strict";

  const config = window.ANDRIUK_CMS_CONFIG || {};
  const url = String(config.supabaseUrl || "").replace(/\/$/, "");
  const key = String(config.supabasePublishableKey || "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || key.length < 30) return;

  const headers = {
    apikey: key,
    Accept: "application/json"
  };

  async function read(path) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      headers,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`CMS request failed (${response.status})`);
    return response.json();
  }

  function safeUrl(value, kind) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (kind === "email") return `mailto:${text.replace(/[\r\n]/g, "")}`;
    if (kind === "phone") return `tel:${text.replace(/[^+\d]/g, "")}`;
    try {
      const parsed = new URL(text, window.location.origin);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch (_error) {
      return "";
    }
  }

  function applyText(section, values) {
    if (!values || typeof values !== "object") return;
    Object.entries(values).forEach(([field, value]) => {
      if (typeof value !== "string") return;
      document.querySelectorAll(`[data-cms-text="${section}.${field}"]`).forEach((element) => {
        element.textContent = value;
      });
    });
  }

  function applyContactLinks(contacts) {
    if (!contacts || typeof contacts !== "object") return;
    const knownLinks = {
      donationUrl: 'a[href="https://secure.wayforpay.com/donate/for_ukraine"]',
      facebook: 'a[href="https://www.facebook.com/blagofond.andriyuk/"]',
      instagram: 'a[href="https://www.instagram.com/peremoga_fond__maybutnye/"]',
      email: 'a[href="mailto:info@andriukfoundation.com"]',
      phone: 'a[href="tel:+380986567935"]'
    };
    Object.entries(knownLinks).forEach(([field, selector]) => {
      const kind = field === "email" ? "email" : field === "phone" ? "phone" : "url";
      const href = safeUrl(contacts[field], kind);
      if (!href) return;
      document.querySelectorAll(selector).forEach((element) => { element.href = href; });
    });
    document.querySelectorAll("[data-cms-href]").forEach((element) => {
      const field = element.dataset.cmsHref;
      const value = contacts[field];
      const href = safeUrl(value, field === "email" ? "email" : field === "phone" ? "phone" : "url");
      if (href) element.href = href;
    });
  }

  function createProgramCard(item, index) {
    const icons = ["fa-shield-halved", "fa-tooth", "fa-children", "fa-hospital", "fa-house-chimney-user", "fa-paw"];
    const tones = ["text-brand-blue", "text-brand-gold", "text-brand-blue", "text-green-600", "text-brand-gold", "text-green-600"];
    const backgrounds = ["bg-blue-50", "bg-amber-50", "bg-blue-50", "bg-green-50", "bg-amber-50", "bg-green-50"];
    const article = document.createElement("article");
    article.className = "bg-white rounded-3xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition flex flex-col justify-between";

    const content = document.createElement("div");
    content.className = "p-8 space-y-4";
    const iconWrap = document.createElement("div");
    iconWrap.className = `w-14 h-14 ${backgrounds[index % backgrounds.length]} rounded-2xl flex items-center justify-center ${tones[index % tones.length]} text-2xl font-bold`;
    const icon = document.createElement("i");
    icon.className = `fa-solid ${icons[index % icons.length]}`;
    icon.setAttribute("aria-hidden", "true");
    const title = document.createElement("h3");
    title.className = "text-2xl font-bold text-brand-dark";
    title.textContent = String(item.title || "Програма допомоги");
    const summary = document.createElement("p");
    summary.className = "text-gray-600 leading-relaxed";
    summary.textContent = String(item.summary || "");
    iconWrap.append(icon);
    content.append(iconWrap, title, summary);

    const footer = document.createElement("div");
    footer.className = "px-8 pb-8 pt-0";
    const link = document.createElement("a");
    link.className = "inline-flex items-center text-brand-blue font-bold hover:text-brand-dark transition";
    link.textContent = "Детальніше →";
    link.href = safeUrl(item.url, "url") || "#";
    footer.append(link);
    article.append(content, footer);
    return article;
  }

  function renderPrograms(programs) {
    const container = document.querySelector("[data-cms-programs]");
    if (!container || !Array.isArray(programs) || !programs.length) return;
    container.replaceChildren(...programs.map(createProgramCard));
  }

  function createPostCard(post) {
    const article = document.createElement("article");
    article.className = "bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-3";
    const date = document.createElement("time");
    date.className = "text-sm font-bold text-brand-blue";
    date.dateTime = post.published_at;
    date.textContent = new Date(`${post.published_at}T12:00:00`).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const title = document.createElement("h3");
    title.className = "text-2xl font-bold text-brand-dark";
    title.textContent = String(post.title || "");
    article.append(date, title);

    if (post.excerpt) {
      const excerpt = document.createElement("p");
      excerpt.className = "text-gray-700 font-medium leading-relaxed";
      excerpt.textContent = post.excerpt;
      article.append(excerpt);
    }
    if (post.body) {
      const body = document.createElement("p");
      body.className = "text-gray-600 leading-relaxed";
      body.style.whiteSpace = "pre-line";
      body.textContent = post.body;
      article.append(body);
    }
    const href = safeUrl(post.link, "url");
    if (href) {
      const link = document.createElement("a");
      link.className = "inline-flex items-center text-brand-blue font-bold hover:underline";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Відкрити матеріал →";
      article.append(link);
    }
    return article;
  }

  function renderPosts(posts) {
    const section = document.querySelector("[data-cms-posts-section]");
    const container = document.querySelector("[data-cms-posts]");
    if (!section || !container || !Array.isArray(posts) || !posts.length) return;
    container.replaceChildren(...posts.map(createPostCard));
    section.hidden = false;
  }

  Promise.all([
    read("site_content?select=section,published"),
    read("site_posts?select=id,title,published_at,excerpt,body,link&status=eq.published&order=published_at.desc")
  ]).then(([rows, posts]) => {
    const content = Object.fromEntries((rows || []).map((row) => [row.section, row.published]));
    applyText("homepage", content.homepage);
    applyText("organization", content.organization);
    applyText("contacts", content.contacts);
    applyContactLinks(content.contacts);
    renderPrograms(content.programs);
    renderPosts(posts);
  }).catch((error) => {
    console.warn("Не вдалося оновити вміст сайту.", error);
  });
})();
