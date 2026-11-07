/* Rock sedimentation lesson — interactive pieces. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  /* ---------- 1. Stepper ---------- */
  var steps = [
    {
      title: "التجوية",
      text: "تفتّت الصخور وتتحلل إلى قطع أصغر في مكانها دون أن تنتقل. قد تكون ميكانيكية (الحرارة والبرد والجذور تكسر الصخر) أو كيميائية (الماء والأحماض تذيب المعادن).",
      example: "تشقّق صخرة جبلية بفعل تكرار تمدّد الماء وتجمّده في الشقوق."
    },
    {
      title: "التعرية",
      text: "تُزال المواد المتفتتة من مكانها وتُحمل بعيداً بفعل عوامل التعرية، وهي الماء الجاري والرياح والجليد.",
      example: "جريان مياه الأمطار يجرف التربة والحصى من سفح التل."
    },
    {
      title: "النقل",
      text: "تنتقل الرواسب مع العامل الناقل (الماء أو الرياح أو الجليد). وكلما كانت سرعة العامل أكبر، حمل قطعاً أكبر حجماً.",
      example: "يحمل النهر الحصى الكبير في فيضانه، والطين الناعم في مجراه الهادئ."
    },
    {
      title: "الترسيب",
      text: "تتوقف الرواسب عن الحركة وتستقر عندما تقل سرعة العامل الناقل، فتتكوّن طبقة جديدة. تترسب القطع الكبيرة أولاً ثم الأصغر فالأصغر.",
      example: "عند مصب النهر في البحيرة أو البحر تتراكم الرمال والطين."
    },
    {
      title: "الدفن والانضغاط",
      text: "تُدفن الرواسب تحت طبقات أحدث، فيزداد الضغط عليها ويُطرد الماء من بين حبيباتها، فتصبح أكثر تماسكاً.",
      example: "ضغط آلاف الأمتار من الرواسب فوق طبقة الطين في قاع البحر."
    },
    {
      title: "التصخّر (التلاحم)",
      text: "تترسب معادن كالكالسيت والسيليكا بين الحبيبات كمادة لاحمة، فتلتحم الرواسب وتتحول إلى صخر رسوبي صلب.",
      example: "تتحول رمال الصحراء المتراصة إلى حجر رملي بعد ترسب مادة لاحمة بينها."
    }
  ];

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".step-btn"));
  var panel = document.getElementById("step-panel");
  var titleEl = document.getElementById("step-title");
  var textEl = document.getElementById("step-text");
  var exampleEl = document.getElementById("step-example");
  var barEl = document.getElementById("step-bar");

  function showStep(index) {
    var s = steps[index];
    if (!s) return;
    tabs.forEach(function (t, i) {
      var active = i === index;
      t.setAttribute("aria-selected", active ? "true" : "false");
      t.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tabs[index].id);
    panel.classList.remove("is-changing");
    void panel.offsetWidth; // restart animation
    panel.classList.add("is-changing");
    titleEl.textContent = s.title;
    textEl.textContent = s.text;
    exampleEl.textContent = s.example;
    barEl.style.width = ((index + 1) / steps.length * 100) + "%";
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      showStep(parseInt(tab.getAttribute("data-step"), 10));
    });
    tab.addEventListener("keydown", function (e) {
      var i = parseInt(tab.getAttribute("data-step"), 10);
      var next = null;
      if (e.key === "ArrowLeft") next = (i + 1) % steps.length;   // RTL: left moves forward
      if (e.key === "ArrowRight") next = (i - 1 + steps.length) % steps.length;
      if (next !== null) {
        e.preventDefault();
        tabs[next].focus();
        showStep(next);
      }
    });
  });
  showStep(0);

  /* ---------- 2. Layer simulator ---------- */
  var stack = document.getElementById("layerStack");
  var status = document.getElementById("simStatus");
  var addBtn = document.getElementById("addLayer");
  var resetBtn = document.getElementById("resetLayers");

  var materials = [
    "رمل ناعم", "حصى", "طين", "أصداف بحرية", "رمل خشن", "كربونات الكالسيوم", "طين غني بالمواد العضوية"
  ];
  var count = 0;

  function setStatus(msg) { status.textContent = msg; }

  addBtn.addEventListener("click", function () {
    count += 1;
    var layer = document.createElement("div");
    layer.className = "layer";
    layer.textContent = "طبقة " + count + ": " + materials[(count - 1) % materials.length];
    stack.appendChild(layer); // column-reverse: appended = top of pile
    if (count === 1) setStatus("هذه أقدم طبقة، وهي في الأسفل.");
    else setStatus("الطبقة " + count + " أحدث من التي تحتها، لذلك وضعناها في الأعلى.");
    if (count >= 12) {
      addBtn.disabled = true;
      setStatus("وصلت إلى الحد الأقصى للمحاكاة. اضغط «إعادة» للبدء من جديد.");
    }
  });

  resetBtn.addEventListener("click", function () {
    stack.innerHTML = "";
    count = 0;
    addBtn.disabled = false;
    setStatus("");
  });

  /* ---------- 3. Quiz ---------- */
  var answers = { q1: "b", q2: "b", q3: "b", q4: "a" };
  var form = document.getElementById("quiz");
  var scoreEl = document.getElementById("quizScore");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var score = 0;
    Object.keys(answers).forEach(function (name) {
      var labels = form.querySelectorAll('input[name="' + name + '"]');
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      Array.prototype.forEach.call(labels, function (input) {
        input.parentElement.classList.remove("is-correct", "is-wrong");
      });
      if (!checked) return;
      var correct = checked.value === answers[name];
      if (correct) score += 1;
      checked.parentElement.classList.add(correct ? "is-correct" : "is-wrong");
      if (!correct) {
        var right = form.querySelector('input[name="' + name + '"][value="' + answers[name] + '"]');
        if (right) right.parentElement.classList.add("is-correct");
      }
    });
    var total = Object.keys(answers).length;
    var msg = "نتيجتك: " + score + " من " + total;
    if (score === total) msg += " — ممتاز!";
    else msg += " — راجع المراحل وأعد المحاولة.";
    scoreEl.textContent = msg;
  });

  form.addEventListener("reset", function () {
    setTimeout(function () {
      form.querySelectorAll("label").forEach(function (l) {
        l.classList.remove("is-correct", "is-wrong");
      });
      scoreEl.textContent = "";
    }, 0);
  });
})();
