(function () {
  "use strict";

  /* ---------- بيانات الدرس ---------- */
  var STEPS = [
    {
      title: "الوضوء",
      pose: "stand",
      text: "قبل الصلاة نتوضأ: نغسل الوجه، ثم اليدين إلى المرفقين، ثم نمسح الرأس، ثم نغسل الرجلين إلى الكعبين. الوضوء شرط لصحة الصلاة.",
      dhikr: "﴿...فَاغْسِلُوا وُجُوهَكُمْ وَأَيْدِيَكُمْ إِلَى الْمَرَافِقِ...﴾",
      speak: "قبل الصلاة نتوضأ. نغسل الوجه واليدين إلى المرفقين، ونمسح الرأس، ونغسل الرجلين إلى الكعبين."
    },
    {
      title: "الوقوف مستقبل القبلة والنية",
      pose: "stand",
      text: "نقف مستقبلين القبلة، وننوي الصلاة بقلوبنا. النية محلها القلب، ولا نتلفظ بها.",
      dhikr: "النية في القلب",
      speak: "نقف مستقبلين القبلة، وننوي الصلاة بقلوبنا."
    },
    {
      title: "تكبيرة الإحرام",
      pose: "takbir",
      text: "نرفع يدينا حذو المنكبين أو الأذنين، ونقول: الله أكبر، ثم نضع اليمنى على اليسرى.",
      dhikr: "اللهُ أَكْبَرُ",
      speak: "نرفع أيدينا ونقول: الله أكبر."
    },
    {
      title: "القيام وقراءة الفاتحة",
      pose: "stand",
      text: "نضع اليدين على الصدر، ونقرأ سورة الفاتحة، ثم نقول آمين، ثم نقرأ ما تيسر من القرآن.",
      dhikr: "﴿الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ﴾",
      speak: "نقرأ سورة الفاتحة، ثم نقول آمين، ثم نقرأ ما تيسر من القرآن."
    },
    {
      title: "الركوع",
      pose: "ruku",
      text: "ننحني ونجعل ظهورنا مستوية، ونمسك الركبتين بأيدينا، ونطمئن في الركوع.",
      dhikr: "سُبْحَانَ رَبِّيَ الْعَظِيمِ (٣ مرات)",
      speak: "ننحني في الركوع ونقول: سبحان ربي العظيم، ثلاث مرات."
    },
    {
      title: "الرفع من الركوع",
      pose: "stand",
      text: "نرفع رؤوسنا ونقف مستقيمين ومطمئنين.",
      dhikr: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ",
      speak: "نرفع رؤوسنا ونقول: سمع الله لمن حمده، ربنا ولك الحمد."
    },
    {
      title: "السجود",
      pose: "sujud",
      text: "نكبر وننزل إلى السجود، فنضع على الأرض: الجبهة مع الأنف، واليدين، والركبتين، وأطراف أصابع القدمين.",
      dhikr: "سُبْحَانَ رَبِّيَ الْأَعْلَى (٣ مرات)",
      speak: "نسجد ونقول: سبحان ربي الأعلى، ثلاث مرات."
    },
    {
      title: "الجلسة بين السجدتين",
      pose: "sit",
      text: "نرفع رؤوسنا ونجلس مطمئنين، ونقول الدعاء.",
      dhikr: "رَبِّ اغْفِرْ لِي",
      speak: "نجلس بين السجدتين ونقول: رب اغفر لي."
    },
    {
      title: "السجدة الثانية",
      pose: "sujud",
      text: "نسجد السجدة الثانية كالأولى، ثم نقوم للركعة الثانية.",
      dhikr: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      speak: "نسجد السجدة الثانية، ونقول: سبحان ربي الأعلى."
    },
    {
      title: "التشهد",
      pose: "sit",
      text: "نجلس ونضع اليد اليمنى على الفخذ، ونرفع السبابة عند الشهادة، ونقول التشهد.",
      dhikr: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ... أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
      speak: "نجلس ونقول التشهد: التحيات لله، والصلوات، والطيبات، أشهد أن لا إله إلا الله، وأشهد أن محمدا عبده ورسوله."
    },
    {
      title: "الصلاة على النبي ﷺ",
      pose: "sit",
      text: "في التشهد الأخير نصلي على النبي ﷺ، ثم ندعو بما نحب.",
      dhikr: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ",
      speak: "نصلي على النبي ﷺ ونقول: اللهم صل على محمد وعلى آل محمد."
    },
    {
      title: "التسليم",
      pose: "stand",
      text: "نلتفت إلى اليمين ونقول: السلام عليكم ورحمة الله، ثم نلتفت إلى اليسار ونقول مثلها. وبهذا تنتهي الصلاة.",
      dhikr: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
      speak: "نلتفت إلى اليمين ونقول: السلام عليكم ورحمة الله، ثم إلى اليسار ونقول مثلها."
    }
  ];

  var QUIZ = [
    {
      q: "ما الشيء الذي نفعله قبل أن نبدأ الصلاة؟",
      options: ["الوضوء", "الأكل", "النوم"],
      answer: 0,
      explain: "الوضوء شرط لصحة الصلاة."
    },
    {
      q: "بماذا نبدأ الصلاة؟",
      options: ["سورة الفاتحة", "تكبيرة الإحرام: الله أكبر", "السلام عليكم"],
      answer: 1,
      explain: "نبدأ الصلاة بتكبيرة الإحرام، وهي التي تدخلنا في الصلاة."
    },
    {
      q: "كم مرة نقول «سبحان ربي العظيم» في الركوع؟",
      options: ["مرة واحدة", "ثلاث مرات", "سبع مرات"],
      answer: 1,
      explain: "نقولها ثلاث مرات، وهذا أقل ما يُجزئ عند جمهور أهل العلم."
    },
    {
      q: "كم تسليمة نقول في آخر الصلاة؟",
      options: ["تسليمة واحدة", "تسليمتين: يمين ويسار", "ثلاث تسليمات"],
      answer: 1,
      explain: "نسلم عن اليمين ثم عن اليسار."
    },
    {
      q: "أين محل النية؟",
      options: ["في القلب", "نقولها بصوت عالٍ", "لا نحتاجها"],
      answer: 0,
      explain: "النية محلها القلب، ولا يلزم التلفظ بها."
    }
  ];

  /* ---------- رسم الوضعيات ---------- */
  var POSES = {
    stand: {
      head: [100, 62], sh: [100, 98], hip: [100, 160],
      el1: [78, 124], ha1: [98, 116], el2: [122, 124], ha2: [102, 116],
      k1: [94, 200], f1: [92, 240], k2: [106, 200], f2: [108, 240]
    },
    takbir: {
      head: [100, 62], sh: [100, 98], hip: [100, 160],
      el1: [72, 74], ha1: [80, 40], el2: [128, 74], ha2: [120, 40],
      k1: [94, 200], f1: [92, 240], k2: [106, 200], f2: [108, 240]
    },
    ruku: {
      head: [168, 150], sh: [142, 140], hip: [100, 160],
      el1: [150, 186], ha1: [132, 200], el2: [162, 186], ha2: [146, 204],
      k1: [94, 200], f1: [92, 240], k2: [106, 200], f2: [108, 240]
    },
    sujud: {
      head: [44, 222], sh: [66, 214], hip: [132, 206],
      el1: [66, 236], ha1: [58, 248], el2: [76, 238], ha2: [68, 248],
      k1: [160, 222], f1: [190, 240], k2: [160, 230], f2: [192, 246]
    },
    sit: {
      head: [100, 70], sh: [100, 102], hip: [100, 186],
      el1: [78, 150], ha1: [84, 184], el2: [122, 150], ha2: [116, 184],
      k1: [150, 190], f1: [124, 236], k2: [158, 200], f2: [130, 244]
    }
  };

  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function line(a, b, color, width) {
    return el("line", {
      x1: a[0], y1: a[1], x2: b[0], y2: b[1],
      stroke: color, "stroke-width": width, "stroke-linecap": "round", class: "part"
    });
  }

  function drawFigure(poseName) {
    var svg = document.getElementById("figure");
    var p = POSES[poseName];
    svg.innerHTML = "";

    // الأرض
    svg.appendChild(el("line", { x1: 20, y1: 252, x2: 180, y2: 252, stroke: "#cfd8d3", "stroke-width": 3, "stroke-linecap": "round" }));

    var body = "#2e7d5b", limb = "#1f4e3d", skin = "#f4c27a";

    // الأرجل
    svg.appendChild(line(p.hip, p.k1, limb, 14));
    svg.appendChild(line(p.k1, p.f1, limb, 14));
    svg.appendChild(line(p.hip, p.k2, limb, 14));
    svg.appendChild(line(p.k2, p.f2, limb, 14));

    // الجذع
    svg.appendChild(line(p.sh, p.hip, body, 30));

    // الذراعان
    svg.appendChild(line(p.sh, p.el1, body, 12));
    svg.appendChild(line(p.el1, p.ha1, body, 12));
    svg.appendChild(line(p.sh, p.el2, body, 12));
    svg.appendChild(line(p.el2, p.ha2, body, 12));

    // الرأس
    svg.appendChild(el("circle", { cx: p.head[0], cy: p.head[1], r: 20, fill: skin, class: "head" }));
  }

  /* ---------- المشغّل ---------- */
  var current = 0;
  var stepList = document.getElementById("stepList");
  var visited = {};

  function renderList() {
    stepList.innerHTML = "";
    STEPS.forEach(function (s, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      if (i === current) btn.classList.add("active");
      if (visited[i]) btn.classList.add("done");
      var n = document.createElement("span");
      n.className = "n";
      n.textContent = i + 1;
      btn.appendChild(n);
      btn.appendChild(document.createTextNode(s.title));
      btn.addEventListener("click", function () { goTo(i); });
      li.appendChild(btn);
      stepList.appendChild(li);
    });
  }

  function render() {
    var s = STEPS[current];
    visited[current] = true;
    drawFigure(s.pose);
    document.getElementById("stepCount").textContent = "الخطوة " + (current + 1) + " من " + STEPS.length;
    document.getElementById("stepTitle").textContent = s.title;
    document.getElementById("stepText").textContent = s.text;
    document.getElementById("stepDhikr").textContent = s.dhikr;
    document.getElementById("prevBtn").disabled = current === 0;
    document.getElementById("nextBtn").textContent = current === STEPS.length - 1 ? "إنهاء ✓" : "التالي";
    document.getElementById("progressBar").style.width = ((current + 1) / STEPS.length * 100) + "%";
    renderList();
  }

  function goTo(i) {
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    render();
  }

  document.getElementById("prevBtn").addEventListener("click", function () { goTo(current - 1); });
  document.getElementById("nextBtn").addEventListener("click", function () {
    if (current === STEPS.length - 1) {
      document.getElementById("quiz").scrollIntoView();
      return;
    }
    goTo(current + 1);
  });

  // الاستماع (اختياري، إذا كان المتصفح يدعمه)
  document.getElementById("speakBtn").addEventListener("click", function () {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(STEPS[current].speak);
      u.lang = "ar-SA";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) { /* المتصفح لا يدعم الصوت */ }
  });

  /* ---------- الاختبار ---------- */
  var quizBox = document.getElementById("quizBox");
  var qIndex = 0;
  var score = 0;

  function renderQuiz() {
    quizBox.innerHTML = "";
    if (qIndex >= QUIZ.length) {
      var res = document.createElement("div");
      res.className = "result";
      res.innerHTML = '<p class="q">أحسنت! انتهيت من الاختبار</p>' +
        '<div class="big">' + score + " / " + QUIZ.length + "</div>" +
        '<p class="note">راجع الدرس وأعد الاختبار لتحصل على الدرجة الكاملة.</p>';
      var again = document.createElement("button");
      again.className = "btn primary";
      again.type = "button";
      again.textContent = "أعد الاختبار";
      again.addEventListener("click", function () { qIndex = 0; score = 0; renderQuiz(); });
      res.appendChild(again);
      quizBox.appendChild(res);
      return;
    }

    var item = QUIZ[qIndex];
    var q = document.createElement("div");
    q.className = "q";
    q.textContent = "السؤال " + (qIndex + 1) + " من " + QUIZ.length + ": " + item.q;
    quizBox.appendChild(q);

    var opts = document.createElement("div");
    opts.className = "opts";
    var feedback = document.createElement("div");
    feedback.className = "feedback";
    var buttons = [];

    item.options.forEach(function (text, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.textContent = text;
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.disabled = true; });
        if (idx === item.answer) {
          b.classList.add("correct");
          score++;
          feedback.className = "feedback good";
          feedback.textContent = "إجابة صحيحة! " + item.explain;
        } else {
          b.classList.add("wrong");
          buttons[item.answer].classList.add("correct");
          feedback.className = "feedback bad";
          feedback.textContent = "ليست صحيحة. " + item.explain;
        }
        var nextRow = document.createElement("div");
        nextRow.className = "next-row";
        var nb = document.createElement("button");
        nb.type = "button";
        nb.className = "btn primary";
        nb.textContent = qIndex === QUIZ.length - 1 ? "عرض النتيجة" : "السؤال التالي";
        nb.addEventListener("click", function () { qIndex++; renderQuiz(); });
        nextRow.appendChild(nb);
        quizBox.appendChild(nextRow);
      });
      buttons.push(b);
      opts.appendChild(b);
    });

    quizBox.appendChild(opts);
    quizBox.appendChild(feedback);
  }

  /* ---------- البدء ---------- */
  render();
  renderQuiz();
})();
