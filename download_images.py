import urllib.request
import urllib.parse
import re
import os

# Directory for images
os.makedirs('images', exist_ok=True)

url = 'https://andriukfoundation.org'
print(f"Fetching {url}...")
# Fetch the page with a User-Agent header
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
except Exception as e:
    print(f"Error fetching {url}: {e}")
    exit()

# Find images
# Simple regex for img tags
img_pattern = re.compile(r'<img[^>]+src="([^">]+)"')
images = img_pattern.findall(html)

print(f"Found {len(images)} potential image links.")

for img_url in images:
    if not img_url.startswith('http'):
        # Handle relative URLs
        img_url = urllib.parse.urljoin(url, img_url)

    # Filter out common small icons/trackers, focus on 'uploads'
    if 'wp-content/uploads' in img_url:
        filename = os.path.basename(urllib.parse.urlparse(img_url).path)
        # Avoid overwriting if multiple sizes have same name (unlikely with basename, but possible)
        # For now, just save.
        try:
            print(f"Downloading: {filename}...")
            # Use headers to mimic a browser to bypass 403
            req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': url})
            with urllib.request.urlopen(req) as response, open(os.path.join('images', filename), 'wb') as out_file:
                out_file.write(response.read())
        except Exception as e:
            print(f"Failed to download {img_url}: {e}")

print("Done.")
