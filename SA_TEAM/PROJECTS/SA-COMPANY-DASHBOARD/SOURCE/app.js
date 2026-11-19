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
    var finValue = fin.monthly
      ? fin.monthly.amount.toLocaleString("en-US") + " " + fin.currency + " / شهر"
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
        el("p", { text: "أول ما تنزل الأرقام في finance-input.json تظهر هنا." })
      ]));
      return;
    }
    if (fin.monthly) {
      body.appendChild(el("div", { class: "card" }, [
        el("div", { class: "sub", text: "إيراد شهري ثابت" }),
        el("h2", { text: fin.monthly.amount.toLocaleString("en-US") + " " + fin.currency + " / شهر" }),
        el("p", { class: "sub", text: "يبدأ من " + fin.monthly.start + (fin.monthly.note ? " · " + fin.monthly.note : "") })
      ]));
    }
    if (fin.entries.length) {
      var tbody = el("tbody");
      fin.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).forEach(function (e) {
        tbody.appendChild(el("tr", null, [
          el("td", { text: e.date }),
          el("td", { text: e.source }),
          el("td", { text: e.amount.toLocaleString("en-US") + " " + fin.currency }),
          el("td", { text: e.note || "" })
        ]));
      });
      body.appendChild(el("div", { class: "table-wrap", style: "margin-top:12px" }, [
        el("table", null, [
          el("thead", null, [el("tr", null, [el("th", { text: "التاريخ" }), el("th", { text: "المصدر" }), el("th", { text: "المبلغ" }), el("th", { text: "ملاحظة" })])]),
          tbody
        ])
      ]));
    }
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
        el("td", { class: "wrap " + statusKind(e.status), text: e.status })
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


  // ---------- أخبار تويتر: شات بأسلوب واتساب (بالذكاء الاصطناعي) ----------
  function renderNews() {
    var news = DATA.news || { items: [], updated: "", note: "" };
    var body = document.getElementById("wa-body");
    var form = document.getElementById("wa-form");
    var input = document.getElementById("wa-input");
    var sendBtn = document.getElementById("wa-send");
    var stopBtn = document.getElementById("wa-stop");
    var chips = document.getElementById("wa-chips");
    document.getElementById("wa-note").textContent =
      (news.note || "المصادر من بحث الويب.") + (news.updated ? " · آخر تحديث للأخبار: " + news.updated : "");

    function safeHref(u) { return /^https:\/\//.test(String(u || "")) ? u : null; }
    function addBubble(kind, nodes) {
      var b = el("div", { class: "bub " + kind }, nodes);
      body.appendChild(b);
      body.scrollTop = body.scrollHeight;
      return b;
    }
    function newsBubble(it) {
      var tag = el("span", { class: "tag " + (it.confirmed ? "ok" : "warn"), text: it.confirmed ? "مؤكد" : "غير مؤكد" });
      var srcs = el("div", { class: "srcs" });
      (it.sources || []).forEach(function (s, i) {
        var h = safeHref(s.url);
        if (!h) return;
        srcs.appendChild(el("a", { href: h, target: "_blank", rel: "noopener noreferrer", text: "[" + (i + 1) + "] " + (s.name || "مصدر") }));
      });
      return addBubble("in", [
        el("div", null, [tag, el("span", { text: it.topic || "" })]),
        el("h4", { text: it.title }),
        el("div", { text: it.summary }),
        el("div", { class: "meta", text: (it.date_note || "") + (it.confirmation_note ? " · " + it.confirmation_note : "") }),
        srcs
      ]);
    }

    clear(body);
    if (!news.items.length) {
      addBubble("in", [el("div", { text: "ما فيه أخبار محفوظة بعد." })]);
    } else {
      body.appendChild(el("div", { class: "wa-day", text: news.updated || "اليوم" }));
      addBubble("in", [el("div", { text: "هلا. هذي أبرز أخبار الشرق الأوسط اللي تأكدت منها من المصادر. اسألني أو اطلب تحليل." })]);
      news.items.forEach(newsBubble);
    }

    // نص الأخبار اللي يعتمد عليه الذكاء الاصطناعي (بأرقام المصادر)
    function digest() {
      return news.items.map(function (it, n) {
        var src = (it.sources || []).map(function (s, i) { return "  [" + (n + 1) + "." + (i + 1) + "] " + s.name + " — " + s.url; }).join("\n");
        return (n + 1) + ". [" + (it.confirmed ? "مؤكد" : "غير مؤكد") + "] " + it.topic + ": " + it.title + "\n   " + it.summary +
          "\n   التاريخ: " + (it.date_note || "غير محدد") + "\n   ملاحظة التأكيد: " + (it.confirmation_note || "-") + "\n" + src;
      }).join("\n\n");
    }
    var RULES = [
      "أنت «راصد الأخبار»، محلل سياسي هادئ وخبير في شؤون الشرق الأوسط، وأنت ذكاء اصطناعي ولست شخصاً حقيقياً.",
      "قواعد صارمة:",
      "١) اعتمد فقط على الأخبار المرفقة أدناه. إذا السؤال خارجها قل صراحة إنه ما عندك مصدر، ولا تخترع أخبار أو أرقام أو أسماء أو تواريخ.",
      "٢) اذكر رقم المصدر بين قوسين مربعين بجانب كل معلومة، مثل [1.2].",
      "٣) فرّق بين الخبر المؤكد (أكثر من مصدر مستقل) وغير المؤكد، وانسب الادعاءات لأصحابها (مثل: الحوثيون قالوا).",
      "٤) اربط الأحداث ببعضها وأعطِ تحليلاً سياسياً، لكن علّمه بوضوح كتقدير (مثل «أرجّح» أو «ممكن»)، وما تقدمه كحقيقة. اذكر سيناريوهين محتملين على الأكثر، وما يغيّر كل سيناريو.",
      "٥) لا تتبنى موقفاً سياسياً ولا تحرّض. اعرض موقف كل طرف منسوباً له.",
      "٦) اكتب بعربية مبسطة بلهجة خليجية مهذبة، بفقرات قصيرة، وبدون مبالغة.",
      "",
      "الأخبار المتاحة (آخر تحديث: " + (news.updated || "غير محدد") + "):",
      ""
    ].join("\n");

    var turns = [];
    var ctl = null;

    function ask(q) {
      q = String(q || "").trim();
      if (!q) return;
      addBubble("out", [el("div", { text: q })]);
      input.value = "";
      sendBtn.disabled = true;
      stopBtn.hidden = false;
      var thinking = addBubble("in thinking", [el("div", { text: "يكتب..." })]);
      turns.push({ role: "user", content: q });
      var history = turns.slice(-8);
      var payload = [{ role: "user", content: RULES + digest() }].concat(history);
      // يتأكد إن الدور الأخير مستخدم والأول مستخدم
      claude.use("sample").then(function (sample) {
        if (!sample) {
          thinking.className = "bub in";
          thinking.textContent = "الدردشة الحية غير متاحة هنا. افتح الصفحة من claude.ai وسجّل دخول.";
          return null;
        }
        ctl = new AbortController();
        return sample(payload, {
          cache: false,
          signal: ctl.signal,
          onText: function (u) { thinking.className = "bub in"; thinking.textContent = u.text; body.scrollTop = body.scrollHeight; }
        }).then(function (r) {
          turns.push({ role: "assistant", content: r.text });
          thinking.textContent = r.text + (r.truncated ? "\n(انقطع الرد، اسأل سؤال أقصر)" : "");
        });
      }).catch(function (e) {
        var code = e && e.code;
        if (code === "cancelled") { thinking.className = "bub in"; thinking.textContent = (e.text || "") + (e.text ? "\n" : "") + "(أوقفته)"; return; }
        var msg = "تعذر الرد.";
        if (code === "not_granted") msg = "ما انسمح للصفحة تستخدم Claude. اسمح لها من نافذة الموافقة.";
        else if (code === "rate_limited") msg = "كثرت الطلبات. جرّب بعد شوي.";
        else if (code === "sampling_disabled") msg = "Claude غير متاح لحسابك.";
        thinking.className = "bub in";
        thinking.textContent = (e && e.text ? e.text + "\n" : "") + msg;
      }).then(function () {
        sendBtn.disabled = false;
        stopBtn.hidden = true;
        ctl = null;
      });
    }

    form.addEventListener("submit", function (ev) { ev.preventDefault(); ask(input.value); });
    stopBtn.addEventListener("click", function () { if (ctl) ctl.abort(); });
    clear(chips);
    ["حلل لي الوضع بين إيران وأمريكا", "وش احتمالات تهدئة غزة؟", "اربط الأحداث ببعضها", "وش المؤكد وغير المؤكد؟"].forEach(function (q) {
      var c = el("button", { class: "wa-chip", type: "button", text: q });
      c.addEventListener("click", function () { ask(q); });
      chips.appendChild(c);
    });
  }

  renderOverview();
  renderReports();
  renderFinance();
  renderEmployees();
  renderProjects();
  renderNews();
})();
