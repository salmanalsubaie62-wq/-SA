(function () {
  "use strict";

  var DATA = window.SA_DATA || { reports: [], projects: [], employees: [], finance: { entries: [], has_data: false } };

  // ---------- أدوات مساعدة ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function badge(text, kind) { return el("span", { class: "badge " + (kind || ""), text: text }); }
  function statusKind(text) {
    if (/غير معروف/.test(text)) return "";
    if (/أنجز|منجز|خلص|يعمل|جاهز|تشتغل/.test(text)) return "ok";
    if (/ينتظر|يحتاج|معلّق|مؤجل/.test(text)) return "warn";
    return "";
  }
  function progressNumber(text) {
    var m = /(\d+)\s*٪|(\d+)\s*%/.exec(text || "");
    if (!m) return null;
    return parseInt(m[1] || m[2], 10);
  }
  function listOrEmpty(items, emptyText) {
    if (!items || !items.length) return el("p", { class: "sub", text: emptyText });
    return el("ul", null, items.map(function (t) { return el("li", { text: t }); }));
  }

  // ---------- التبويبات ----------
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-tab");
      tabs.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      document.querySelectorAll(".panel").forEach(function (p) {
        p.classList.toggle("is-active", p.id === "tab-" + name);
      });
    });
  });

  // ---------- بيانات مشتقة ----------
  var dates = Array.from(new Set(DATA.reports.map(function (r) { return r.date; }))).sort().reverse();
  var latest = dates[0] || null;
  var latestReports = DATA.reports.filter(function (r) { return r.date === latest; });
  var workToday = latestReports.filter(function (r) { return r.has_work; });

  // ---------- نظرة عامة ----------
  function renderOverview() {
    var kpis = document.getElementById("kpis");
    clear(kpis);
    var fin = DATA.finance;
    var finValue = fin.has_data
      ? fin.entries.reduce(function (s, e) { return s + e.amount; }, 0).toLocaleString("en-US") + " " + fin.currency
      : "لا بيانات";
    [
      [String(latestReports.length), "تقارير اليوم" + (latest ? " (" + latest + ")" : "")],
      [String(workToday.length), "موظفين عندهم شغل منجز"],
      [String(DATA.projects.length), "مشاريع مفتوحة"],
      [finValue, "الإيرادات"]
    ].forEach(function (k) {
      kpis.appendChild(el("div", { class: "kpi" }, [
        el("div", { class: "num", text: k[0] }),
        el("div", { class: "label", text: k[1] })
      ]));
    });

    var hi = document.getElementById("highlights");
    clear(hi);
    if (!workToday.length) {
      hi.appendChild(el("li", { class: "sub", text: "ما فيه شغل منجز مسجل لهذا اليوم." }));
    } else {
      workToday.forEach(function (r) {
        hi.appendChild(el("li", null, [el("strong", { text: r.employee + ": " }), r.today[0] || ""]));
      });
    }

    var nd = document.getElementById("needs-decision");
    clear(nd);
    var items = [];
    DATA.reports.forEach(function (r) {
      r.pending.forEach(function (p) { items.push({ who: r.employee, text: p }); });
    });
    DATA.projects.forEach(function (p) {
      p.problems.forEach(function (x) { items.push({ who: "مشروع " + p.name, text: x }); });
    });
    if (!items.length) {
      nd.appendChild(el("li", { class: "sub", text: "ما فيه شي ينتظر قرارك." }));
    } else {
      items.slice(0, 12).forEach(function (i) {
        nd.appendChild(el("li", null, [el("strong", { text: i.who + ": " }), i.text]));
      });
    }

    document.getElementById("last-build").textContent =
      "عدد التقارير: " + DATA.reports.length + " · آخر يوم: " + (latest || "لا يوجد");
  }

  // ---------- التقارير ----------
  function renderReports() {
    var dateSel = document.getElementById("date-select");
    var empSel = document.getElementById("emp-select");
    var onlyWork = document.getElementById("only-work");

    if (!dates.length) {
      dateSel.appendChild(el("option", { value: "", text: "لا توجد تقارير" }));
    } else {
      dates.forEach(function (d) { dateSel.appendChild(el("option", { value: d, text: d })); });
    }
    var names = Array.from(new Set(DATA.reports.map(function (r) { return r.employee; })));
    names.forEach(function (n) { empSel.appendChild(el("option", { value: n, text: n })); });

    function draw() {
      var day = dateSel.value;
      var emp = empSel.value;
      var rows = DATA.reports.filter(function (r) {
        return (!day || r.date === day) && (!emp || r.employee === emp) && (!onlyWork.checked || r.has_work);
      });
      document.getElementById("report-count").textContent = "عرض " + rows.length + " تقرير";
      var box = document.getElementById("report-cards");
      clear(box);
      if (!rows.length) {
        box.appendChild(el("div", { class: "empty", text: "ما فيه تقارير تطابق الفلتر." }));
        return;
      }
      rows.forEach(function (r) {
        box.appendChild(reportCard(r));
      });
    }
    dateSel.addEventListener("change", draw);
    empSel.addEventListener("change", draw);
    onlyWork.addEventListener("change", draw);
    if (latest) dateSel.value = latest;
    draw();
  }

  function reportCard(r) {
    var kind = r.has_work ? "ok" : "";
    return el("article", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("div", null, [
          el("h3", { text: r.employee }),
          el("div", { class: "sub", text: r.title + (r.supervisor ? " · المشرف: " + r.supervisor : "") })
        ]),
        el("div", null, [badge(r.date), badge(r.has_work ? "شغل منجز" : "ما فيه شغل مسجل", kind)])
      ]),
      el("div", { class: "section-label", text: "وش صار اليوم" }),
      listOrEmpty(r.today, "ما فيه شغل مسجل."),
      r.status ? el("div", null, [el("div", { class: "section-label", text: "الحالة" }), el("p", { text: r.status, style: "margin:0" })]) : null,
      el("div", { class: "section-label", text: "المعلّق والمطلوب" }),
      listOrEmpty(r.pending, "ما فيه شي معلّق."),
      r.next ? el("div", null, [el("div", { class: "section-label", text: "الخطوة الجاية" }), el("p", { text: r.next, style: "margin:0" })]) : null
    ]);
  }

  // ---------- الإيرادات ----------
  function renderFinance() {
    var body = document.getElementById("finance-body");
    clear(body);
    var fin = DATA.finance;
    if (!fin.has_data) {
      body.appendChild(el("div", { class: "empty" }, [
        el("h2", { text: "ما فيه بيانات إيرادات بعد" }),
        el("p", { text: "ما نعرض أرقام مخترعة. أول ما تنزل بيانات الإيرادات في ملف finance-input.json (بجانب build_data.py) وتشغّل السكربت، تظهر هنا تلقائياً." })
      ]));
      return;
    }
    var total = fin.entries.reduce(function (s, e) { return s + e.amount; }, 0);
    body.appendChild(el("div", { class: "card" }, [
      el("h2", { text: "الإجمالي: " + total.toLocaleString("en-US") + " " + fin.currency })
    ]));
    var wrap = el("div", { class: "table-wrap", style: "margin-top:12px" });
    var tbody = el("tbody");
    fin.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).forEach(function (e) {
      tbody.appendChild(el("tr", null, [
        el("td", { text: e.date }),
        el("td", { text: e.source }),
        el("td", { text: e.amount.toLocaleString("en-US") + " " + fin.currency }),
        el("td", { text: e.note || "" })
      ]));
    });
    wrap.appendChild(el("table", null, [
      el("thead", null, [el("tr", null, [el("th", { text: "التاريخ" }), el("th", { text: "المصدر" }), el("th", { text: "المبلغ" }), el("th", { text: "ملاحظة" })])]),
      tbody
    ]));
    body.appendChild(wrap);
  }

  // ---------- الموظفين ----------
  function renderEmployees() {
    var tb = document.getElementById("employees-body");
    clear(tb);
    DATA.employees.forEach(function (e) {
      tb.appendChild(el("tr", null, [
        el("td", { text: e.name }),
        el("td", { text: e.title }),
        el("td", { text: e.supervisor }),
        el("td", null, [badge(e.status, statusKind(e.status))])
      ]));
    });
  }

  // ---------- المشاريع ----------
  function renderProjects() {
    var box = document.getElementById("project-cards");
    clear(box);
    DATA.projects.forEach(function (p) {
      var pct = progressNumber(p.progress);
      var bar = pct == null ? null : el("div", { class: "progress" }, [el("span", { style: "width:" + Math.max(0, Math.min(100, pct)) + "%" })]);
      box.appendChild(el("article", { class: "card" }, [
        el("div", { class: "card-head" }, [
          el("div", null, [el("h3", { text: p.name }), el("div", { class: "sub", text: "المسؤول: " + p.owner + " · آخر تحديث: " + p.updated })]),
          el("div", null, [badge(p.stage, statusKind(p.stage))])
        ]),
        el("p", { class: "sub", text: "الإنجاز: " + p.progress }),
        bar,
        el("div", { class: "section-label", text: "المهام" }),
        p.tasks.length
          ? el("ul", null, p.tasks.map(function (t) {
              return el("li", null, [t.task + " (" + t.employee + ") ", badge(t.status, statusKind(t.status))]);
            }))
          : el("p", { class: "sub", text: "ما فيه مهام مسجلة." }),
        el("div", { class: "section-label", text: "المشاكل المفتوحة" }),
        listOrEmpty(p.problems, "ما فيه مشاكل مسجلة."),
        el("div", { class: "section-label", text: "المخرجات" }),
        listOrEmpty(p.outputs, "لا توجد مخرجات بعد.")
      ]));
    });
  }

  renderOverview();
  renderReports();
  renderFinance();
  renderEmployees();
  renderProjects();
})();
