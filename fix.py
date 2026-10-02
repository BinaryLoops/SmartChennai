import os

path = "src/app/[locale]/dashboard/public-works/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("\\`", "`")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
