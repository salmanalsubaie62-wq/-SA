"""يولّد ملفات JSON للموقع من تقارير الموظفين وحالة المشاريع وبيانات الإيرادات.

الاستخدام: python3 SOURCE/build_data.py
المخرجات: SOURCE/data/reports.json, projects.json, employees.json, finance.json (يُنشأ فارغ إذا ما كان موجود)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SA_TEAM = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REPORTS_DIR = os.path.join(SA_TEAM, "REPORTS")
EMPLOYEES_DIR = os.path.join(SA_TEAM, "EMPLOYEES")
PROJECTS_DIR = os.path.join(SA_TEAM, "PROJECTS")
DATA_DIR = os.path.join(HERE, "data")
FINANCE_SRC = os.path.join(HERE, "finance-input.json")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def parse_bullets(block):
    items = []
    for line in block.splitlines():
        line = line.strip()
        if line.startswith("- "):
            item = line[2:].strip()
            if item and item != "-" and not item.startswith("ما فيه شغل مسجل") and item != "ما فيه شي معلّق.":
                items.append(item)
        elif line and not line.startswith("|") and not line.startswith("_"):
            items.append(line)
    return items


def parse_sections(text):
    """يقسم الماركداون حسب عناوين ## ويرجع dict: العنوان -> النص."""
    sections = {}
    current = None
    buf = []
    for line in text.splitlines():
        m = re.match(r"^##\s+(.*)$", line)
        if m:
            if current is not None:
                sections[current] = "\n".join(buf).strip()
            current = m.group(1).strip()
            buf = []
        elif line.strip() == "---" and current is not None:
            sections[current] = "\n".join(buf).strip()
            current = None
            buf = []
        elif current is not None:
            buf.append(line)
    if current is not None:
        sections[current] = "\n".join(buf).strip()
    return sections


def parse_report(path, date):
    text = read(path)
    h1 = re.search(r"^#\s+تقرير\s+(.+?)\s+—", text, re.M)
    name = h1.group(1).strip() if h1 else os.path.basename(path)
    role = re.search(r"\*\*الوظيفة:\*\*\s*(.+)", text)
    sup = re.search(r"\*\*المشرف:\*\*\s*(.+)", text)
    s = parse_sections(text)
    return {
        "date": date,
        "file": os.path.basename(path),
        "employee": name,
        "title": role.group(1).strip() if role else "",
        "supervisor": sup.group(1).strip() if sup else "",
        "today": parse_bullets(s.get("وش صار اليوم", "")),
        "has_work": bool(parse_bullets(s.get("وش صار اليوم", ""))),
        "status": s.get("الحالة في نهاية اليوم", "").strip(),
        "pending": parse_bullets(s.get("المعلّق والمطلوب", "")),
        "next": s.get("الخطوة الجاية", "").strip(),
        "summary_md": text,
    }


def build_reports():
    reports = []
    if not os.path.isdir(REPORTS_DIR):
        return reports
    for date in sorted(os.listdir(REPORTS_DIR)):
        day = os.path.join(REPORTS_DIR, date)
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date) or not os.path.isdir(day):
            continue
        for fname in sorted(os.listdir(day)):
            if not re.match(r"^\d{2}-.+\.md$", fname):
                continue  # يتجاهل README وغيره
            reports.append(parse_report(os.path.join(day, fname), date))
    return reports


def parse_project(folder):
    path = os.path.join(PROJECTS_DIR, folder, "STATUS.md")
    if not os.path.isfile(path):
        return None
    text = read(path)

    def field(label):
        m = re.search(rf"^- {label}:\s*(.+)$", text, re.M)
        return m.group(1).strip() if m else "غير معروف"

    tasks = []
    for line in text.splitlines():
        if line.startswith("|") and not line.startswith("|---") and "المهمة" not in line:
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) == 3:
                tasks.append({"task": cells[0], "employee": cells[1], "status": cells[2]})
    s = parse_sections(text)
    return {
        "name": folder,
        "stage": field("المرحلة"),
        "progress": field("الإنجاز"),
        "owner": field("المسؤول"),
        "updated": field("آخر تحديث"),
        "tasks": tasks,
        "decisions": parse_bullets(s.get("القرارات", "")),
        "problems": parse_bullets(s.get("المشاكل المفتوحة", "")),
        "outputs": parse_bullets(s.get("المخرجات النهائية", "")),
    }


def build_projects():
    if not os.path.isdir(PROJECTS_DIR):
        return []
    out = []
    for folder in sorted(os.listdir(PROJECTS_DIR)):
        p = parse_project(folder)
        if p:
            out.append(p)
    return out


def build_employees():
    out = []
    if not os.path.isdir(EMPLOYEES_DIR):
        return out
    for fname in sorted(os.listdir(EMPLOYEES_DIR)):
        if not re.match(r"^\d{2}-.+\.md$", fname):
            continue
        text = read(os.path.join(EMPLOYEES_DIR, fname))
        h1 = re.search(r"^#\s+\d+\.\s+(.+?)\s+—\s+(.+)$", text, re.M)
        sup = re.search(r"\|\s*\*\*المشرف\*\*\s*\|\s*(.+?)\s*\|", text)
        status = re.search(r"\|\s*\*\*الحالة\*\*\s*\|\s*(.+?)\s*\|", text)
        out.append({
            "file": fname,
            "name": h1.group(1).strip() if h1 else fname,
            "title": h1.group(2).strip() if h1 else "",
            "supervisor": sup.group(1).strip() if sup else "",
            "status": status.group(1).strip() if status else "غير معروفة",
        })
    return out


def build_finance():
    """الإيرادات: ما فيه بيانات في أي ملف حالياً. إذا وُجد finance-input.json ينسخ منه، وإلا يكون فارغ."""
    if os.path.isfile(FINANCE_SRC):
        data = json.loads(read(FINANCE_SRC))
        entries = data.get("entries", [])
        for e in entries:
            if not all(k in e for k in ("date", "amount", "source")):
                sys.exit("finance-input.json: كل مدخل لازم يكون فيه date و amount و source")
            if not isinstance(e["amount"], (int, float)):
                sys.exit("finance-input.json: amount لازم يكون رقم")
        return {"currency": data.get("currency", "KWD"), "entries": entries, "has_data": bool(entries)}
    return {"currency": "KWD", "entries": [], "has_data": False}


def write(name, obj):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def main():
    reports = build_reports()
    projects = build_projects()
    employees = build_employees()
    finance = build_finance()
    write("reports.json", reports)
    write("projects.json", projects)
    write("employees.json", employees)
    write("finance.json", finance)
    # نسخة JS عشان الموقع يشتغل من ملف محلي بدون خادم (fetch ما يشتغل على file://)
    bundle = {"reports": reports, "projects": projects, "employees": employees, "finance": finance}
    with open(os.path.join(DATA_DIR, "site-data.js"), "w", encoding="utf-8") as f:
        f.write("window.SA_DATA = " + json.dumps(bundle, ensure_ascii=False) + ";\n")
    print(f"تقارير: {len(reports)} · مشاريع: {len(projects)} · موظفين: {len(employees)} · إيرادات: {len(finance['entries'])} مدخل")


if __name__ == "__main__":
    main()
