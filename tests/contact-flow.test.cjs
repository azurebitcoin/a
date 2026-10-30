const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const person = {
  sender: 'ContactTestNameQZ',
  contact: 'private-contact-qz@example.invalid',
  city: 'ContactTestCityQZ',
  message: 'ContactTestMessageQZ <script>window.__injected = true</script> & + ?'
};
const privateValues = [...Object.values(person), 'SensitiveSubjectQZ'];
let server, browser, origin;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch (_) {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openSite(t, url, options = {}) {
  const context = await browser.newContext({ javaScriptEnabled: options.javaScriptEnabled !== false });
  const commands = [], requests = [], errors = [], mailNavigations = [];
  await context.exposeBinding('__recordAnalytics', (_, command) => { commands.push(command); });
  await context.route('**/*', async route => {
    const req = route.request();
    requests.push({ url: req.url(), body: req.postData() });
    // Never contact live Google tags, analytics, email services, or other sites.
    if (new URL(req.url()).origin !== origin) {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    }
    return route.continue();
  });
  await context.addInitScript(settings => {
    window.__analyticsPending = [];
    window.dataLayer = [];
    window.dataLayer.push = function (...items) {
      for (const item of items) window.__analyticsPending.push(window.__recordAnalytics(Array.from(item)));
      return Array.prototype.push.apply(this, items);
    };
    if (!localStorage.getItem('__contact_test_initialized')) {
      if (settings.consent) localStorage.setItem('andriuk_cookie_consent', settings.consent);
      for (const [key, value] of Object.entries(settings.session || {})) sessionStorage.setItem(key, value);
      localStorage.setItem('__contact_test_initialized', '1');
    }
    window.__clipboardWrites = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => {
        if (settings.clipboardFails) throw new Error('Clipboard unavailable');
        window.__clipboardWrites.push(text);
      }
    } });
    if (settings.blockSession) {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage blocked'); } });
    } else if (settings.failSessionKeys) {
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === window.sessionStorage && settings.failSessionKeys.includes(key)) throw new Error('Quota exceeded');
        return originalSet.call(this, key, value);
      };
    }
    if (settings.blockLocal) {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Consent storage blocked'); } });
    }
  }, { consent: 'granted', ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Page.enable');
  cdp.on('Page.frameRequestedNavigation', event => {
    if (event.url.startsWith('mailto:')) mailNavigations.push(event.url);
  });
  await page.goto(origin + url);
  await page.waitForLoadState('load');
  async function events(name) {
    await page.evaluate(() => Promise.all(window.__analyticsPending || []));
    return commands.filter(command => command[0] === 'event' && (!name || command[1] === name));
  }
  t.after(async () => {
    try {
      const customEvents = await events();
      assert.deepEqual(errors, [], 'No JavaScript errors');
      assert.equal(customEvents.some(([, name]) => ['generate_lead', 'contact_submit', 'volunteer_interest', 'contact_received'].includes(name)), false);
      for (const [, name, params] of customEvents) {
        if (name.startsWith('contact_letter_') || name === 'contact_send_intent') {
          assert.deepEqual(Object.keys(params).sort(), ['contact_language', 'contact_source', 'contact_topic']);
        }
      }
      for (const value of privateValues) {
        assert.equal(JSON.stringify(commands).includes(value), false, 'Personal data must not enter gtag');
        assert.equal(JSON.stringify(requests).includes(value), false, 'Personal data must not enter network requests');
        assert.equal(JSON.stringify(requests).includes(encodeURIComponent(value)), false, 'Encoded personal data must not enter requests');
      }
    } finally {
      await context.close();
    }
  });
  return { page, events, commands, requests, mailNavigations };
}

async function fillLetter(page, topic, message = person.message) {
  for (const name of ['sender', 'contact', 'city']) await page.locator(`[name="${name}"]`).fill(`  ${person[name]}  `);
  await page.locator('[name="message"]').fill(`  ${message}  `);
  if (topic) await page.locator('[name="topic"]').selectOption({ label: topic });
}

async function prepare(page, locale, topic) {
  await fillLetter(page, topic);
  await Promise.all([
    page.waitForURL(origin + locale.draft),
    page.locator('#letter-form button[type="submit"]').click()
  ]);
  await page.locator('#letter-result').waitFor({ state: 'visible' });
}

async function waitUntil(condition) {
  const end = Date.now() + 5000;
  while (!condition() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(condition(), 'Expected browser action occurred');
}

const locales = [
  { lang: 'uk', contact: '/kontakti.html', draft: '/dyakuyemo-za-zvernennya.html', volunteer: 'Волонтерство та партнерство', heading: 'Надішліть лист до фонду', greeting: 'Добрий день!' },
  { lang: 'en', contact: '/en/kontakti.html', draft: '/en/dyakuyemo-za-zvernennya.html', volunteer: 'Volunteering and partnership', heading: 'Send your letter to the foundation', greeting: 'Hello,' }
];

for (const locale of locales) {
  test(`${locale.lang}: real form prepares a draft; copy and mail intent stay separate; a second draft counts`, async t => {
    const { page, events, mailNavigations, requests } = await openSite(t, locale.contact);
    assert.equal(await page.locator('#letter-form').isVisible(), true, 'Shared script loads in this language');
    assert.ok(requests.some(req => req.url === origin + '/js/site.js?v=20261030-contact'));
    await prepare(page, locale, locale.volunteer);
    assert.equal(await page.locator('h1').textContent(), locale.heading);
    const text = await page.locator('#letter-preview').inputValue();
    assert.ok(text.startsWith(locale.greeting));
    for (const value of Object.values(person)) assert.ok(text.includes(value));
    assert.equal(await page.evaluate(() => window.__injected), undefined, 'Draft is plain text');
    assert.deepEqual((await events('contact_letter_prepared')).map(event => event[2]), [{
      contact_source: 'letter_form', contact_language: locale.lang, contact_topic: 'volunteering'
    }]);
    assert.equal((await events()).length, 1, 'Preparation is not a send intent');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('andriuk-analytics-ready'));
      window.dispatchEvent(new Event('andriuk-analytics-ready'));
    });
    await page.reload();
    assert.equal((await events('contact_letter_prepared')).length, 1, 'Reload and consent notifications do not duplicate preparation');
    assert.equal(await page.locator('#letter-preview').inputValue(), text);
    assert.equal(await page.locator('#letter-open').getAttribute('href'), 'mailto:info@andriukfoundation.com');
    await page.locator('#letter-copy').click();
    await page.waitForFunction(() => window.__clipboardWrites.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__clipboardWrites), [text]);
    assert.equal((await events('contact_letter_copied')).length, 1);
    await page.locator('#letter-open').click();
    await waitUntil(() => mailNavigations.length === 1);
    const composed = new URL(mailNavigations[0]);
    assert.equal(composed.pathname, 'info@andriukfoundation.com');
    assert.equal(composed.searchParams.get('subject'), locale.volunteer);
    assert.equal(composed.searchParams.get('body'), text);
    assert.equal((await events('contact_send_intent')).length, 1);
    assert.equal((await events('contact_click')).length, 0, 'Prepared mail does not create a second generic click');
    await page.locator('#letter-open').click();
    assert.equal((await events('contact_send_intent')).length, 2, 'Each deliberate activation is an action');
    await page.goto(origin + locale.contact);
    await prepare(page, locale, locale.volunteer);
    assert.equal((await events('contact_letter_prepared')).length, 2, 'Second preparation in the same session is counted');
  });

  test(`${locale.lang}: invalid forms never create a draft or analytics preparation`, async t => {
    const { page, events } = await openSite(t, locale.contact);
    await page.locator('#letter-form button[type="submit"]').click();
    assert.equal(page.url(), origin + locale.contact);
    await fillLetter(page, locale.volunteer);
    await page.locator('[name="city"]').fill('');
    // Also exercise the JS guard when a submit event is dispatched directly.
    await page.locator('#letter-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
    assert.equal(page.url(), origin + locale.contact);
    assert.equal(await page.locator('#letter-result').isVisible(), false);
    assert.deepEqual(await events(), []);
  });

  test(`${locale.lang}: preparation waits for consent; rejected/revoked copy and intent are never replayed`, async t => {
    const { page, events } = await openSite(t, locale.contact, { consent: null });
    // Dismiss the banner before interacting with the form.
    await page.locator('#cookie-reject').click();
    await prepare(page, locale, locale.volunteer);
    assert.deepEqual(await events(), []);
    await page.locator('#letter-copy').click();
    await page.locator('#letter-open').click();
    assert.deepEqual(await events(), []);
    await page.locator('#cookie-settings').click();
    await page.locator('#cookie-accept').click();
    assert.equal((await events('contact_letter_prepared')).length, 1);
    assert.equal((await events('contact_send_intent')).length, 0);
    assert.equal((await events('contact_letter_copied')).length, 0);
    await page.locator('#cookie-settings').click();
    await page.locator('#cookie-reject').click();
    await page.locator('#letter-copy').click();
    await page.locator('#letter-open').click();
    await page.locator('#cookie-settings').click();
    await page.locator('#cookie-accept').click();
    assert.equal((await events()).length, 1, 'Revoked actions and the consumed preparation are not replayed');
  });

  test(`${locale.lang}: blocked session storage keeps the usable draft on the contact page`, async t => {
    const { page, events } = await openSite(t, locale.contact, { blockSession: true });
    await fillLetter(page, locale.volunteer);
    await page.locator('#letter-form button[type="submit"]').click();
    assert.equal(page.url(), origin + locale.contact);
    assert.equal(await page.locator('#letter-result').isVisible(), true);
    assert.ok((await page.locator('#letter-preview').inputValue()).includes(person.message));
    assert.equal((await events('contact_letter_prepared')).length, 1);
    await page.locator('#letter-copy').click();
    await page.locator('#letter-open').click();
    assert.equal((await events('contact_letter_copied')).length, 1);
    assert.equal((await events('contact_send_intent')).length, 1);
    await page.locator('[name="message"]').fill(person.message + ' second');
    await page.locator('#letter-form button[type="submit"]').click();
    assert.equal((await events('contact_letter_prepared')).length, 2);
  });

  test(`${locale.lang}: partial storage failure does not redirect away from the prepared text`, async t => {
    const { page, events } = await openSite(t, locale.contact, { failSessionKeys: ['andriuk_letter_topic'] });
    await fillLetter(page, locale.volunteer);
    await page.locator('#letter-form button[type="submit"]').click();
    assert.equal(page.url(), origin + locale.contact);
    assert.ok((await page.locator('#letter-preview').inputValue()).includes(person.message));
    assert.equal((await events('contact_letter_prepared')).length, 1);
    await page.evaluate(() => window.dispatchEvent(new Event('andriuk-analytics-ready')));
    assert.equal((await events('contact_letter_prepared')).length, 1);
  });

  test(`${locale.lang}: a direct visit, reload and legacy lead flags do not count preparations`, async t => {
    const { page, events } = await openSite(t, locale.draft, { session: {
      andriuk_lead_pending: '1', andriuk_letter_preview: person.message,
      andriuk_letter_topic: locale.volunteer, andriuk_generate_lead_sent: 'sent'
    } });
    assert.equal(await page.locator('#letter-preview').inputValue(), person.message);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('andriuk_lead_pending')), null);
    await page.reload();
    await page.evaluate(() => window.dispatchEvent(new Event('andriuk-analytics-ready')));
    assert.deepEqual(await events(), []);
  });

  test(`${locale.lang}: a direct visit without a saved draft offers no draft tools or conversion`, async t => {
    const { page, events } = await openSite(t, locale.draft, { session: { andriuk_letter_prepared_pending: '1' } });
    assert.equal(await page.locator('#letter-result').isVisible(), false);
    assert.equal(await page.locator('h1').textContent(), locale.heading);
    assert.deepEqual(await events(), []);
  });

  test(`${locale.lang}: unknown stored subjects cannot leak to event parameters`, async t => {
    const { page, events } = await openSite(t, locale.draft, { session: {
      andriuk_letter_prepared_pending: '1', andriuk_letter_preview: person.message,
      andriuk_letter_topic: 'SensitiveSubjectQZ'
    } });
    assert.equal((await events('contact_letter_prepared'))[0][2].contact_topic, 'other');
    await page.locator('#letter-open').click();
    assert.equal((await events('contact_send_intent'))[0][2].contact_topic, 'other');
    assert.equal(await page.locator('#letter-open').getAttribute('href'), 'mailto:info@andriukfoundation.com');
  });

  test(`${locale.lang}: clipboard failure selects text without claiming it was copied`, async t => {
    const { page, events } = await openSite(t, locale.draft, { clipboardFails: true, session: {
      andriuk_letter_preview: person.message, andriuk_letter_topic: locale.volunteer
    } });
    await page.locator('#letter-copy').click();
    assert.equal(await page.locator('#letter-preview').evaluate(el => el.selectionEnd - el.selectionStart), person.message.length);
    assert.deepEqual(await events(), []);
  });

  test(`${locale.lang}: unavailable consent storage suppresses analytics while retaining the draft`, async t => {
    const { page, events } = await openSite(t, locale.contact, { blockLocal: true, blockSession: true });
    await page.locator('#cookie-reject').click();
    await fillLetter(page, locale.volunteer);
    await page.locator('#letter-form button[type="submit"]').click();
    await page.locator('#letter-copy').click();
    await page.locator('#letter-open').click();
    assert.equal(await page.locator('#letter-result').isVisible(), true);
    assert.deepEqual(await events(), []);
  });

  test(`${locale.lang}: JavaScript disabled leaves direct email and telephone fallbacks`, async t => {
    const { page, events } = await openSite(t, locale.contact, { javaScriptEnabled: false });
    assert.equal(await page.locator('#letter-form').isVisible(), false);
    assert.equal(await page.locator('noscript a[href="mailto:info@andriukfoundation.com"]').isVisible(), true);
    assert.equal(await page.locator('noscript a[href^="tel:"]').isVisible(), true);
    assert.deepEqual(await events(), []);
  });
}
