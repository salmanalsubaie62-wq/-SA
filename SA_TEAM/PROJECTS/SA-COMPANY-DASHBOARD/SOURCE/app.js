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


  // ---------- أخبار تويتر: شات بأسلوب واتساب (وكيل ذكاء اصطناعي) ----------
  function renderNews() {
    var news = DATA.news || { items: [], updated: "", note: "", channels: [] };
    var body = document.getElementById("wa-body");
    var form = document.getElementById("wa-form");
    var input = document.getElementById("wa-input");
    var sendBtn = document.getElementById("wa-send");
    var stopBtn = document.getElementById("wa-stop");
    var chips = document.getElementById("wa-chips");
    var attachBtn = document.getElementById("wa-attach");
    var fileInput = document.getElementById("wa-file");
    var preview = document.getElementById("wa-preview");
    document.getElementById("wa-note").textContent =
      (news.note || "المصادر من بحث الويب.") + (news.updated ? " · آخر تحديث للأخبار: " + news.updated : "");

    var pendingImage = null;
    var pendingUrl = null;

    function safeHref(u) { return /^https:\/\//.test(String(u || "")) ? u : null; }
    function addBubble(kind, nodes) {
      var b = el("div", { class: "bub " + kind }, nodes);
      body.appendChild(b);
      body.scrollTop = body.scrollHeight;
      return b;
    }
    function newsBubble(it) {
      var n = (it.channels || []).length;
      var tag = el("span", { class: "tag " + (it.confirmed ? "ok" : "warn"), text: (it.confirmed ? "مؤكد" : "غير مؤكد") + " (" + n + "/3)" });
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
        el("div", { class: "meta", text: (it.date_note || "") + " · القنوات: " + ((it.channels || []).join("، ") || "-") + (it.confirmation_note ? " · " + it.confirmation_note : "") }),
        srcs
      ]);
    }

    clear(body);
    if (!news.items.length) {
      addBubble("in", [el("div", { text: "ما فيه أخبار محفوظة بعد." })]);
    } else {
      body.appendChild(el("div", { class: "wa-day", text: news.updated || "اليوم" }));
      addBubble("in", [el("div", { text: "هلا. أتابع الجزيرة والعربية والعربي، وما أنزل الخبر مؤكداً إلا إذا ورد في القنوات الثلاث، وأركز على أخبار الحرب فقط. اسألني أو اطلب تحليل أو ارفق صورة أتحقق منها." })]);
      news.items.forEach(newsBubble);
    }

    function digest() {
      return news.items.map(function (it, n) {
        var src = (it.sources || []).map(function (s, i) { return "  [" + (n + 1) + "." + (i + 1) + "] " + s.name + " — " + s.url; }).join("\n");
        return (n + 1) + ". [" + (it.confirmed ? "مؤكد" : "غير مؤكد") + " " + (it.channels || []).length + "/3] " + it.topic + ": " + it.title +
          "\n   " + it.summary + "\n   التاريخ: " + (it.date_note || "غير محدد") + "\n   القنوات: " + ((it.channels || []).join("، ") || "-") +
          "\n   ملاحظة التأكيد: " + (it.confirmation_note || "-") + "\n" + src;
      }).join("\n\n");
    }
    var RULES = [
      "أنت «راصد الأخبار»، وكيل ذكاء اصطناعي بدور محلل سياسي خبير ودارس للعلوم السياسية والعلاقات الدولية (مدارس الواقعية والليبرالية والبنائية، توازن القوى، الردع، الدبلوماسية القسرية، الأمن الإقليمي، القانون الدولي). أنت ذكاء اصطناعي ولست شخصاً حقيقياً، وتتكلم بثقة وعمق لكن بتواضع علمي.",
      "نطاقك أخبار الحرب فقط (ضربات، هجمات، اعتراضات، هدنة ومفاوضات الحرب) وليس الأخبار العادية أو الاجتماعات الروتينية، في: إيران وأمريكا، والحوثيون، ودول الخليج (الكويت، السعودية، البحرين، قطر، الإمارات، عُمان). لا تتناول غزة أو لبنان أو غيرها إلا إذا سألك المستخدم صراحة، وقل إنها خارج متابعتك الحالية وما عندك أخبار عنها في هذي الدفعة.",
      "تتابع ثلاث قنوات: الجزيرة (عاجل)، العربية (عاجل)، والتلفزيون العربي. لا تنزّل خبراً كمؤكد إلا إذا ورد في القنوات الثلاث كلها (وإذا تضاربت الروايات فهو غير مؤكد حتى لو ذكرته الثلاث). ولاحظ اختلاف الخط التحريري بين القنوات عند تضارب الروايات، دون اتهام أحد.",
      "قواعد صارمة:",
      "١) لأي خبر أو واقعة حديثة: اعتمد فقط على الأخبار المرفقة أدناه، واذكر رقم المصدر مثل [1.2]. إذا السؤال عن واقعة غير موجودة فيها قل صراحة: «ما عندي مصدر مؤكد لهذا»، ولا تخترع أخباراً أو أرقاماً أو أسماء أو تواريخ.",
      "٢) للأسئلة العامة (مفاهيم، تاريخ، نظريات، سيناريوهات): أجب من معرفتك الواسعة بوضوح، وعلّمها «معلومة خلفية» وليست خبراً حديثاً، وانتبه إن معرفتك قد لا تشمل أحدث التطورات.",
      "٣) فرّق دائماً بين المؤكد وغير المؤكد، وانسب الادعاءات لأصحابها (الحوثيون قالوا، الجيش الإسرائيلي أعلن...).",
      "٤) اربط الأحداث ببعضها وحلّلها: من المستفيد؟ ما الدوافع والقيود؟ ما رسائل الردع؟ لكن علّم التحليل كتقدير («أرجّح»، «ممكن») وليس حقيقة، واذكر سيناريوهين على الأكثر وما الذي يغيّر كل واحد، وما الذي يثبت أنك مخطئ.",
      "٥) إذا أُرفقت صورة: صف ما تراه بدقة، واقرأ أي نص ظاهر، وقارن مضمونها بالأخبار المرفقة وقل هل يطابق خبراً موجوداً. لا تؤكد صحة الصورة نفسها أبداً: أنت لا تستطيع البحث العكسي ولا معرفة مصدرها الأول أو تاريخها أو إن تم تعديلها. قل ذلك بوضوح، واقترح خطوات التحقق (البحث العكسي بالصورة، مصدر النشر الأول، الموقع والظروف الظاهرة، مقارنتها بتغطية القنوات). علامات مثل الإضاءة أو النص أو التناقض مع الخبر ممكن تذكرها كدلائل ضعيفة لا كإثبات.",
      "٦) لا تتبنى موقفاً سياسياً ولا تحرّض ولا تبرر العنف. اعرض موقف كل طرف منسوباً له.",
      "٧) اكتب بعربية مبسطة بلهجة خليجية مهذبة، بفقرات قصيرة، وبدون مبالغة. ابدأ بالجواب مباشرة.",
      "",
      "الأخبار المتاحة (آخر تحديث: " + (news.updated || "غير محدد") + "):",
      ""
    ].join("\n");

    var turns = [];
    var ctl = null;

    function setPreview(file) {
      if (pendingUrl) { URL.revokeObjectURL(pendingUrl); pendingUrl = null; }
      pendingImage = file || null;
      clear(preview);
      if (!file) { preview.hidden = true; return; }
      pendingUrl = URL.createObjectURL(file);
      var img = el("img", { src: pendingUrl, alt: "" });
      var rm = el("button", { type: "button", text: "إزالة" });
      rm.addEventListener("click", function () { fileInput.value = ""; setPreview(null); });
      preview.appendChild(img);
      preview.appendChild(el("span", { text: file.name }));
      preview.appendChild(rm);
      preview.hidden = false;
    }

    // الصورة تظهر فقط لو هذا العرض يدعمها
    claude.use("sample").then(function (sample) {
      if (!sample || !sample.limits) return;
      return sample.limits().then(function (l) { if (l && l.images) attachBtn.hidden = false; });
    }).catch(function () {});
    attachBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return setPreview(null);
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type) || f.size > 15 * 1024 * 1024) {
        fileInput.value = "";
        addBubble("in", [el("div", { text: "الصورة لازم تكون JPEG أو PNG أو WebP أو GIF وأقل من ١٥ ميغابايت." })]);
        return setPreview(null);
      }
      setPreview(f);
    });

    function ask(q) {
      q = String(q || "").trim();
      var img = pendingImage;
      if (!q && !img) return;
      if (!q && img) q = "هل هذا الخبر في الصورة صحيح؟ حلله وقارنه بالأخبار المتاحة.";
      var nodes = [];
      if (img) nodes.push(el("img", { class: "shot", src: URL.createObjectURL(img), alt: "الصورة المرفقة" }));
      nodes.push(el("div", { text: q }));
      addBubble("out", nodes);
      input.value = "";
      fileInput.value = "";
      setPreview(null);
      sendBtn.disabled = true;
      stopBtn.hidden = false;
      var thinking = addBubble("in thinking", [el("div", { text: "يفكر..." })]);
      turns.push({ role: "user", content: (img ? "[أرفقت صورة] " : "") + q });
      var history = turns.slice(-8);
      var payload = [{ role: "user", content: RULES + digest() }].concat(history);
      claude.use("sample").then(function (sample) {
        if (!sample) {
          thinking.className = "bub in";
          thinking.textContent = "الدردشة الحية غير متاحة هنا. افتح الصفحة من claude.ai وسجّل دخول.";
          return null;
        }
        ctl = new AbortController();
        var opts = {
          cache: false,
          modelTier: "complex",
          signal: ctl.signal,
          onText: function (u) { thinking.className = "bub in"; thinking.textContent = u.text; body.scrollTop = body.scrollHeight; }
        };
        if (img) opts.images = img;
        return sample(payload, opts).then(function (r) {
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
        else if (code === "images_unavailable" || code === "image_rejected") msg = "تعذر إرسال الصورة. جرّب صورة ثانية أو اسأل بدونها.";
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
    ["حلل لي الوضع بين إيران وأمريكا", "وش وضع الحوثيين والسعودية؟", "وش وضع الكويت والبحرين؟", "اربط الأحداث ببعضها", "وش المؤكد وغير المؤكد؟"].forEach(function (q) {
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
