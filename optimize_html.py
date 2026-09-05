import glob, re

files = glob.glob('*.html')

preconnect_block = """    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="stylesheet" href="css/style.css">"""

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Remove existing tailwind cdn script
    content = re.sub(r'<script\s+src="https://cdn\.tailwindcss\.com(?:/[^"]*)?"></script>\s*', '', content, flags=re.IGNORECASE)
    
    # Remove inline tailwind.config script blocks
    content = re.sub(r'<script>\s*tailwind\.config\s*=.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<script>tailwind\.config\s*=.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove old preconnects to avoid duplicates
    content = re.sub(r'<link\s+rel="preconnect"\s+href="https://(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.tailwindcss\.com)"[^>]*>\s*', '', content, flags=re.IGNORECASE)

    # Ensure display=swap in google fonts
    content = re.sub(r'(href="https://fonts\.googleapis\.com/css2\?[^"]*?)(?:&display=swap)?(")', r'\1&display=swap\2', content)

    # Insert preconnects and css/style.css right after <head>
    if '<head>' in content:
        content = content.replace('<head>', '<head>\n' + preconnect_block, 1)
    
    # Clean up redundant inline body/heading font styles if style.css already defines them
    content = re.sub(r'<style>\s*body\s*\{\s*font-family:[^}]*\};\s*h1[^}]*\}\s*</style>', '', content, flags=re.DOTALL)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Optimized {f}")
