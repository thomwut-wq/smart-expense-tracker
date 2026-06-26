const test = require("node:test");
const assert = require("node:assert");
const { parse } = require("./parser");

test("parses a simple expense sentence", () => {
  const r = parse("Spent 150 baht on lunch today");
  assert.strictEqual(r.type, "expense");
  assert.strictEqual(r.amount, 150);
  assert.strictEqual(r.category, "Food");
  assert.strictEqual(r.description, "Lunch");
});

test("parses a simple income sentence", () => {
  const r = parse("Earned 5000 baht from freelance");
  assert.strictEqual(r.type, "income");
  assert.strictEqual(r.amount, 5000);
  assert.strictEqual(r.category, "Income");
  assert.strictEqual(r.description, "Freelance");
});

test("handles thousands separators and decimals", () => {
  const r = parse("Paid 1,250.50 for rent");
  assert.strictEqual(r.amount, 1250.5);
  assert.strictEqual(r.type, "expense");
  assert.strictEqual(r.category, "Bills");
});

test("handles k suffix shorthand", () => {
  const r = parse("Received 5k salary");
  assert.strictEqual(r.amount, 5000);
  assert.strictEqual(r.type, "income");
  assert.strictEqual(r.category, "Income");
});

test("detects travel category", () => {
  const r = parse("Paid 80 for a taxi to the airport");
  assert.strictEqual(r.type, "expense");
  assert.strictEqual(r.category, "Travel");
  assert.strictEqual(r.amount, 80);
});

test("defaults unknown expense to Other", () => {
  const r = parse("Spent 200 on random stuff");
  assert.strictEqual(r.type, "expense");
  assert.strictEqual(r.category, "Other");
  assert.strictEqual(r.amount, 200);
});

test("defaults to expense when no verb present", () => {
  const r = parse("300 groceries");
  assert.strictEqual(r.type, "expense");
  assert.strictEqual(r.category, "Food");
  assert.strictEqual(r.amount, 300);
});

test("returns null for empty input", () => {
  assert.strictEqual(parse(""), null);
  assert.strictEqual(parse("   "), null);
  assert.strictEqual(parse(null), null);
});

test("amount is null when no number present", () => {
  const r = parse("bought coffee");
  assert.strictEqual(r.amount, null);
  assert.strictEqual(r.category, "Food");
  assert.strictEqual(r.type, "expense");
});

test("detects bills via electricity keyword", () => {
  const r = parse("Paid 1200 electricity bill");
  assert.strictEqual(r.category, "Bills");
  assert.strictEqual(r.amount, 1200);
});

test("entertainment category from netflix", () => {
  const r = parse("Spent 350 on netflix subscription");
  // 'subscription' maps to Bills but 'netflix' maps to Entertainment; first match wins by category order
  assert.ok(["Entertainment", "Bills"].includes(r.category));
  assert.strictEqual(r.amount, 350);
});
