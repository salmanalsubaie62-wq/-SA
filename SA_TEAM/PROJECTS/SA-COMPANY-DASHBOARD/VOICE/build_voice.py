"""يبني VOICE/index.html: يضمّ الأخبار من SOURCE/data/news.json داخل القالب.
الاستخدام: python3 VOICE/build_voice.py"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
NEWS = os.path.join(HERE, "..", "SOURCE", "data", "news.json")
with open(NEWS, encoding="utf-8") as f:
    news = json.load(f)
with open(os.path.join(HERE, "voice-template.html"), encoding="utf-8") as f:
    t = f.read()
payload = json.dumps(news, ensure_ascii=False).replace("</", "<\\/")
assert "/*NEWS_JSON*/null" in t
out = t.replace("/*NEWS_JSON*/null", payload)
with open(os.path.join(HERE, "index.html"), "w", encoding="utf-8") as f:
    f.write(out)
print("ok", len(news.get("items", [])), "أخبار")
