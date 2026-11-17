import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyIntent, resolveModel } from "../src/lib/ai/gateway";
import { parsePlan } from "../src/lib/media";
import { stripTags, isPrivateAddress } from "../src/lib/web";

test("auto routing sends programming requests to the coding mode", () => {
  assert.equal(classifyIntent("Why does this function throw an exception?").mode, "coding");
  assert.equal(classifyIntent("```js\nconsole.log(1)\n```").mode, "coding");
});

test("auto routing picks reasoning, writing, educational and creative modes", () => {
  assert.equal(classifyIntent("Solve this equation step by step: 2x+3=11").mode, "reasoning");
  assert.equal(classifyIntent("Translate this paragraph into French").mode, "writing");
  assert.equal(classifyIntent("Explain how photosynthesis works").mode, "educational");
  assert.equal(classifyIntent("Brainstorm slogans for a bakery").mode, "creative");
  assert.equal(classifyIntent("Good morning").mode, "general");
});

test("Arabic intent phrases are recognized", () => {
  assert.equal(classifyIntent("اشرح لي الذكاء الاصطناعي").mode, "educational");
  assert.equal(classifyIntent("ترجم هذه الفقرة").mode, "writing");
});

test("model resolution honours per-mode environment overrides", () => {
  const before = process.env.OMNIA_MODEL_ANTHROPIC_REASONING;
  process.env.OMNIA_MODEL_ANTHROPIC_REASONING = "test-model-override";
  try {
    assert.equal(resolveModel("anthropic", "reasoning"), "test-model-override");
  } finally {
    if (before === undefined) delete process.env.OMNIA_MODEL_ANTHROPIC_REASONING;
    else process.env.OMNIA_MODEL_ANTHROPIC_REASONING = before;
  }
  assert.equal(resolveModel("anthropic", "fast"), "claude-haiku-5-5");
});

test("video plans are parsed from model JSON, tolerating surrounding prose", () => {
  const plan = parsePlan(
    'Here is the plan:\n{"title":"Mug","logline":"Warm mornings","style":"soft","scenes":[{"number":1,"title":"Steam","durationSeconds":5,"visual":"steam rises","camera":"macro","narration":"Start your day","imagePrompt":"steam over a mug"}]}\nThanks',
  );
  assert.equal(plan.title, "Mug");
  assert.equal(plan.scenes.length, 1);
  assert.equal(plan.scenes[0].durationSeconds, 5);
});

test("video plan parsing rejects responses without a structured plan", () => {
  assert.throws(() => parsePlan("no json here"), /structured plan/);
  assert.throws(() => parsePlan('{"title":"x","scenes":[]}'), /no scenes/);
});

test("HTML is reduced to readable text and scripts are removed", () => {
  const text = stripTags("<html><script>alert(1)</script><p>Hello &amp; <b>welcome</b></p><style>x{}</style></html>");
  assert.equal(text.includes("alert"), false);
  assert.equal(text.includes("x{}"), false);
  assert.match(text, /Hello & welcome/);
});

test("the SSRF guard rejects loopback, private and link-local addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.4.4", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "fe80::1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});
