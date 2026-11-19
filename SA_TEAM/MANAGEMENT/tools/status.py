"""حالة المؤسسة: يقرأ STATUS.md لكل مشروع ويعرض جدول. ما يخترع شي: الناقص يطلع 'غير معروف'."""
import os, re
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
proj = os.path.join(root, "PROJECTS")
keys = ["المرحلة", "الإنجاز", "المسؤول", "آخر تحديث"]
rows = []
for name in sorted(os.listdir(proj)) if os.path.isdir(proj) else []:
    f = os.path.join(proj, name, "STATUS.md")
    if not os.path.isdir(os.path.join(proj, name)):
        continue
    data = {k: "غير معروف" for k in keys}
    open_issues = 0
    if os.path.exists(f):
        txt = open(f, encoding="utf-8").read()
        for k in keys:
            m = re.search(rf"^- {k}:\s*(.+)$", txt, re.M)
            if m and m.group(1).strip():
                data[k] = m.group(1).strip()
        sec = re.search(r"## المشاكل المفتوحة\n(.*?)(\n## |\Z)", txt, re.S)
        if sec:
            open_issues = len([l for l in sec.group(1).splitlines() if l.strip().startswith("-") and l.strip() != "-"])
    rows.append([name] + [data[k] for k in keys] + [str(open_issues)])
hdr = ["المشروع"] + keys + ["مشاكل مفتوحة"]
print("| " + " | ".join(hdr) + " |\n|" + "---|" * len(hdr))
for r in rows:
    print("| " + " | ".join(r) + " |")
if not rows:
    print("ما فيه مشاريع بعد. افتح واحد: python3 MANAGEMENT/tools/new_project.py \"اسم\"")
