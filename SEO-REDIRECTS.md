# Пошук: andriukfoundation.com — основний сайт

Два домени фонду зараз конкурують у Google: **andriukfoundation.com** (цей репозиторій, GitHub Pages) і **andriukfoundation.org** (окремий WordPress). Користувач просив, щоб у пошуку перемагав .com.

Цей репозиторій **не керує** хостингом .org. Редиректи на WordPress треба налаштувати окремо.

## Що вже зроблено на .com

- Кожна HTML-сторінка має `<link rel="canonical">` лише на `https://andriukfoundation.com/…`.
- У JSON-LD організації `url` = `https://andriukfoundation.com/`; колишній домен зазначено в `sameAs`, не як основну адресу.
- `sitemap.xml` містить лише URL .com.
- `robots.txt` вказує на sitemap .com.
- Герб фонду — favicon, `apple-touch-icon` і `og:image` на `https://andriukfoundation.com/images/logo-andriuk-foundation.jpg`.

## Що треба зробити на .org (поза цим репозиторієм)

1. У Google Search Console позначити **andriukfoundation.com** основним доменом.
2. На WordPress .org увімкнути **301** з кожного шляху .org на відповідний шлях .com (таблиця `redirects-org-to-com.csv`).
3. Після 301 — подати зміну адреси в Search Console і оновити sitemap .org або вимкнути індексацію .org.
4. Не залишати .org у `url` / canonical як канонічний сайт.

Без 301 з .org пошук і далі може показувати обидва сайти.
