"""يفتح مشروع جديد في PROJECTS من القوالب. الاستخدام: python3 MANAGEMENT/tools/new_project.py "اسم-المشروع" """
import sys, os, datetime
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if len(sys.argv) < 2:
    sys.exit('اكتب اسم المشروع: python3 MANAGEMENT/tools/new_project.py "اسم-المشروع"')
name = sys.argv[1].strip()
p = os.path.join(root, "PROJECTS", name)
if os.path.exists(p):
    sys.exit(f"المشروع موجود من قبل: {p} (ما غيرت فيه شي)")
for d in ["BRIEF", "REFERENCES", "ASSETS", "SOURCE", "OUTPUT", "TESTS", "REPORTS"]:
    os.makedirs(os.path.join(p, d))
today = datetime.date.today().isoformat()
def fill(src, dst):
    t = open(os.path.join(root, "TEMPLATES", src), encoding="utf-8").read()
    open(dst, "w", encoding="utf-8").write(t.replace("{{NAME}}", name).replace("{{DATE}}", today))
fill("project-brief.md", os.path.join(p, "BRIEF", "PROJECT.md"))
fill("project-status.md", os.path.join(p, "STATUS.md"))
print(f"تم فتح المشروع: PROJECTS/{name}")
