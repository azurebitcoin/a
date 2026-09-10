(function () {
  "use strict";

  const config = window.ANDRIUK_ADMIN_CONFIG || {};
  const setupView = document.getElementById("setup-view");
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const nav = document.getElementById("admin-nav");
  const signOutButton = document.getElementById("sign-out");
  const sessionBadge = document.getElementById("session-badge");
  const notice = document.getElementById("notice");
  const allowedEmail = String(config.allowedEmail || "info@andriukfoundation.com").toLowerCase();

  const defaults = {
    homepage: {
      heroEyebrow: "Разом до перемоги",
      heroTitle: "МБФ Олександра Андріюка",
      heroText: "Благодійний фонд створений за ініціативи Олександра Андріюка для всебічної допомоги військовим, дітям та переселенцям.",
      statFunds: "8,3 млн грн",
      statFundsLabel: "Зібрано коштів для цільових програм",
      statAid: "124 тонни",
      statAidLabel: "Передано гуманітарної допомоги"
    },
    organization: {
      about: "Благодійна організація «Міжнародний благодійний фонд Олександра Андріюка» — неприбуткова недержавна благодійна організація.",
      mission: "Системно й прозоро підтримувати людей, які опинилися у складних життєвих обставинах, та об’єднувати волонтерів, благодійників і партнерів."
    },
    contacts: {
      legalName: "Благодійна організація «Міжнародний благодійний фонд Олександра Андріюка»",
      edrpou: "41481057",
      registrationYear: "2017",
      director: "Андріюк Олександр Миколайович",
      email: "info@andriukfoundation.com",
      phone: "+38 (098) 656-79-35",
      address: "33013, Україна, Рівненська обл., м. Рівне, просп. Миру, буд. 17",
      facebook: "https://www.facebook.com/blagofond.andriyuk/",
      instagram: "https://www.instagram.com/peremoga_fond__maybutnye/",
      donationUrl: "https://secure.wayforpay.com/donate/for_ukraine"
    },
    programs: [
      { title: "Допомога військовим", summary: "Спорядження, медикаменти та речі першої необхідності.", url: "/dopomoga-viyskovim.html" },
      { title: "Стоматологія для військових", summary: "Безкоштовна стоматологічна допомога військовослужбовцям.", url: "/stomatologiya-dlya-viyskovih.html" },
      { title: "Допомога дітям", summary: "Підтримка дітей, які опинилися у складних життєвих обставинах.", url: "/dopomoga-dityam.html" },
      { title: "Допомога лікарням", summary: "Обладнання, матеріали та ресурси для медичних закладів.", url: "/dopomoga-likarnyam.html" },
      { title: "Допомога переселенцям", summary: "Гуманітарна й консультаційна підтримка внутрішньо переміщених осіб.", url: "/dopomoga-pereselentsyam.html" },
      { title: "Допомога тваринам", summary: "Порятунок, лікування та догляд за безпритульними тваринами.", url: "/dopomoga-tvarinam.html" }
    ]
  };

  let client;
  let currentUser;
  let contentState = {};
  let programsState = defaults.programs.map((item) => ({ ...item }));
  let postsState = [];

  function configured() {
    return /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || "") && (config.supabaseAnonKey || "").length > 30;
  }

  function showOnly(element) {
    [setupView, loginView, appView].forEach((item) => { item.hidden = item !== element; });
  }

  function showNotice(message, error) {
    notice.textContent = message;
    notice.classList.toggle("is-error", Boolean(error));
    notice.hidden = false;
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 5000);
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.dataset.originalText ||= button.textContent;
    button.textContent = busy ? "Зберігаю…" : button.dataset.originalText;
  }

  function openView(name) {
    document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-visible", panel.dataset.viewPanel === name));
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === name));
    const active = document.querySelector(`[data-view="${name}"]`);
    document.getElementById("page-title").textContent = active ? active.textContent.trim() : "Панель адміністратора";
    document.body.classList.remove("menu-open");
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function populateForm(form, values) {
    Object.entries(values || {}).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field && typeof value !== "object") field.value = value ?? "";
    });
  }

  async function loadContent() {
    const [publishedResult, draftsResult] = await Promise.all([
      client.from("site_content").select("section,published,updated_at"),
      client.from("site_content_drafts").select("section,draft,updated_at")
    ]);
    if (publishedResult.error) throw publishedResult.error;
    if (draftsResult.error) throw draftsResult.error;
    const publishedBySection = Object.fromEntries((publishedResult.data || []).map((row) => [row.section, row]));
    const draftsBySection = Object.fromEntries((draftsResult.data || []).map((row) => [row.section, row]));
    const sections = new Set([...Object.keys(publishedBySection), ...Object.keys(draftsBySection)]);
    contentState = Object.fromEntries(Array.from(sections).map((section) => [section, {
      section,
      published: publishedBySection[section]?.published || {},
      draft: draftsBySection[section]?.draft || publishedBySection[section]?.published || {},
      updated_at: [publishedBySection[section]?.updated_at, draftsBySection[section]?.updated_at].filter(Boolean).sort().at(-1)
    }]));
    document.querySelectorAll("[data-section-form]").forEach((form) => {
      const section = form.dataset.sectionForm;
      populateForm(form, { ...(defaults[section] || {}), ...(contentState[section]?.draft || {}) });
    });
    programsState = Array.isArray(contentState.programs?.draft) && contentState.programs.draft.length
      ? contentState.programs.draft.map((item) => ({ ...item }))
      : defaults.programs.map((item) => ({ ...item }));
    renderPrograms();
    const latest = Object.values(contentState).map((row) => row.updated_at).filter(Boolean).sort().at(-1);
    document.getElementById("last-update").textContent = latest ? new Date(latest).toLocaleString("uk-UA") : "Ще не збережено";
  }

  async function saveSection(section, payload, publish, button) {
    setBusy(button, true);
    try {
      const draftRecord = {
        section,
        draft: payload,
        updated_at: new Date().toISOString()
      };
      const { data: savedDraft, error: draftError } = await client.from("site_content_drafts").upsert(draftRecord).select().single();
      if (draftError) throw draftError;
      let savedPublished = null;
      if (publish) {
        const { data, error } = await client.from("site_content").upsert({
          section,
          published: payload,
          updated_at: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        savedPublished = data;
      }
      contentState[section] = {
        section,
        draft: savedDraft.draft,
        published: savedPublished?.published || contentState[section]?.published || {},
        updated_at: savedPublished?.updated_at || savedDraft.updated_at
      };
      showNotice(publish ? "Зміни опубліковано." : "Чернетку збережено.");
      document.getElementById("last-update").textContent = new Date(contentState[section].updated_at).toLocaleString("uk-UA");
    } catch (error) {
      showNotice(`Не вдалося зберегти: ${error.message}`, true);
    } finally {
      setBusy(button, false);
    }
  }

  function programEditor(item, index) {
    const wrapper = document.createElement("article");
    wrapper.className = "program-editor";
    wrapper.dataset.programIndex = String(index);
    wrapper.innerHTML = '<div class="form-grid"><label>Назва<input data-field="title" type="text" maxlength="120"></label><label>Сторінка<input data-field="url" type="text" maxlength="220"></label><label class="wide">Короткий опис<textarea data-field="summary" rows="3" maxlength="500"></textarea></label></div><div class="form-actions"><button class="button button-danger" type="button" data-remove-program>Видалити</button></div>';
    ["title", "url", "summary"].forEach((field) => { wrapper.querySelector(`[data-field="${field}"]`).value = item[field] || ""; });
    wrapper.querySelectorAll("[data-field]").forEach((field) => field.addEventListener("input", () => { programsState[index][field.dataset.field] = field.value; }));
    wrapper.querySelector("[data-remove-program]").addEventListener("click", () => {
      if (!window.confirm(`Видалити програму «${programsState[index].title || "Без назви"}» із чернетки?`)) return;
      programsState.splice(index, 1);
      renderPrograms();
    });
    return wrapper;
  }

  function renderPrograms() {
    const list = document.getElementById("program-list");
    list.replaceChildren();
    programsState.forEach((item, index) => list.append(programEditor(item, index)));
    if (!programsState.length) {
      const empty = document.createElement("p");
      empty.textContent = "Програм ще немає. Натисніть «Додати програму».";
      empty.className = "form-message";
      list.append(empty);
    }
  }

  async function loadPosts() {
    const { data, error } = await client.from("site_posts").select("*").order("published_at", { ascending: false });
    if (error) throw error;
    postsState = data || [];
    renderPosts();
  }

  function renderPosts() {
    const list = document.getElementById("post-list");
    list.replaceChildren();
    postsState.forEach((post) => {
      const row = document.createElement("article");
      row.className = "list-item";
      const info = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = post.title;
      const meta = document.createElement("p");
      meta.textContent = `${new Date(`${post.published_at}T12:00:00`).toLocaleDateString("uk-UA")} · ${post.status === "published" ? "Опубліковано" : "Чернетка"}`;
      info.append(title, meta);
      const actions = document.createElement("div");
      actions.className = "list-actions";
      const edit = document.createElement("button");
      edit.className = "button button-secondary";
      edit.textContent = "Редагувати";
      edit.addEventListener("click", () => openPost(post));
      const remove = document.createElement("button");
      remove.className = "button button-danger";
      remove.textContent = "Видалити";
      remove.addEventListener("click", () => deletePost(post));
      actions.append(edit, remove);
      row.append(info, actions);
      list.append(row);
    });
    if (!postsState.length) {
      const empty = document.createElement("p");
      empty.textContent = "Публікацій ще немає. Додайте першу новину або звіт.";
      empty.className = "form-message";
      list.append(empty);
    }
  }

  function openPost(post) {
    const form = document.getElementById("post-form");
    form.reset();
    populateForm(form, post || { published_at: new Date().toISOString().slice(0, 10), status: "draft" });
    document.getElementById("post-form-title").textContent = post ? "Редагування публікації" : "Нова публікація";
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deletePost(post) {
    if (!window.confirm(`Остаточно видалити «${post.title}»?`)) return;
    const { error } = await client.from("site_posts").delete().eq("id", post.id);
    if (error) return showNotice(`Не вдалося видалити: ${error.message}`, true);
    postsState = postsState.filter((item) => item.id !== post.id);
    renderPosts();
    showNotice("Публікацію видалено.");
  }

  async function authenticate(session) {
    const email = String(session?.user?.email || "").toLowerCase();
    if (!session || email !== allowedEmail) {
      if (session) await client.auth.signOut();
      currentUser = null;
      showOnly(loginView);
      return;
    }
    currentUser = session.user;
    nav.hidden = false;
    signOutButton.hidden = false;
    sessionBadge.hidden = false;
    showOnly(appView);
    try {
      await Promise.all([loadContent(), loadPosts()]);
    } catch (error) {
      showNotice(`Не вдалося завантажити дані: ${error.message}`, true);
    }
  }

  document.getElementById("menu-toggle").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.view)));
  document.querySelectorAll("[data-open-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.openView)));
  document.querySelectorAll("[data-section-form]").forEach((form) => {
    form.querySelector("[data-save-draft]").addEventListener("click", (event) => saveSection(form.dataset.sectionForm, formData(form), false, event.currentTarget));
    form.querySelector("[data-publish]").addEventListener("click", (event) => saveSection(form.dataset.sectionForm, formData(form), true, event.currentTarget));
  });
  document.getElementById("add-program").addEventListener("click", () => { programsState.push({ title: "", summary: "", url: "" }); renderPrograms(); });
  document.querySelector("[data-programs-draft]").addEventListener("click", (event) => saveSection("programs", programsState, false, event.currentTarget));
  document.querySelector("[data-programs-publish]").addEventListener("click", (event) => saveSection("programs", programsState, true, event.currentTarget));
  document.getElementById("new-post").addEventListener("click", () => openPost(null));
  document.getElementById("close-post").addEventListener("click", () => { document.getElementById("post-form").hidden = true; });
  document.getElementById("post-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setBusy(button, true);
    const payload = formData(event.currentTarget);
    if (!payload.id) delete payload.id;
    payload.updated_at = new Date().toISOString();
    const query = payload.id ? client.from("site_posts").update(payload).eq("id", payload.id) : client.from("site_posts").insert(payload);
    const { error } = await query;
    setBusy(button, false);
    if (error) return showNotice(`Не вдалося зберегти: ${error.message}`, true);
    event.currentTarget.hidden = true;
    await loadPosts();
    showNotice("Публікацію збережено.");
  });

  if (!configured() || !window.supabase?.createClient) {
    showOnly(setupView);
    return;
  }

  client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const message = document.getElementById("login-message");
    setBusy(button, true);
    const { error } = await client.auth.signInWithOtp({
      email: allowedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        shouldCreateUser: true
      }
    });
    setBusy(button, false);
    message.textContent = error ? `Не вдалося надіслати лист: ${error.message}` : "Посилання надіслано. Відкрийте лист на info@andriukfoundation.com.";
  });
  signOutButton.addEventListener("click", () => client.auth.signOut());
  client.auth.onAuthStateChange((_event, session) => authenticate(session));
  client.auth.getSession().then(({ data }) => authenticate(data.session));
})();
