# Search: andriukfoundation.com is the primary site

The foundation currently has two public sites that compete in Google:

- **andriukfoundation.com** — this GitHub Pages repository (keep as primary)
- **andriukfoundation.org** — separate WordPress hosting (must 301 to .com)

User request: «І два сайти б’ються в пошуку» — .com should win.

## This repository cannot change .org

WordPress on **andriukfoundation.org is not in this repo**. No commit here can add server 301s, change the .org canonical, or edit Search Console for that host. A parent/operator must configure .org separately.

## Already done on .com (this repo)

1. Every HTML page has `<link rel="canonical" href="https://andriukfoundation.com/…">` for its own path (redirect stubs point at the live .com URL).
2. JSON-LD NGO `url` is `https://andriukfoundation.com/`. `https://andriukfoundation.org/` is only in `sameAs`, not the primary URL.
3. `sitemap.xml` and `robots.txt` list only .com URLs.
4. Favicon / `og:image` use `https://andriukfoundation.com/images/logo-andriuk-foundation.jpg`.

Archive article **photos** may still load from `andriukfoundation.org/wp-content/…`. Those are image files, not page canonicals.

## What to do on .org and in Search Console

Use the mapping in `redirects-org-to-com.csv` (`from` = .org, `to` = matching .com path).

1. In Google Search Console, set **andriukfoundation.com** as the primary domain.
2. On WordPress .org, add **301** redirects from each .org URL to the matching .com path in that CSV.
3. After 301s work, use Search Console **Change of address** (.org → .com). Stop publishing a .org sitemap, or noindex .org.
4. Do not leave .org as the canonical `url` on WordPress.

Until .org returns 301, Google can keep showing both sites.
