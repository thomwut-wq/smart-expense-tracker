/*
 * Natural-language parser for the Smart Expense Tracker.
 *
 * Turns a sentence such as "Spent 150 baht on lunch today" into a structured
 * object: { type, amount, category, description }.
 *
 * Works both in the browser (attached to window.ExpenseParser) and in Node
 * (module.exports) so the same logic can be unit-tested.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExpenseParser = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Categories and the keywords that map a sentence to them.
  var CATEGORY_KEYWORDS = {
    Food: [
      "food", "lunch", "dinner", "breakfast", "brunch", "snack", "snacks",
      "coffee", "tea", "restaurant", "cafe", "groceries", "grocery", "meal",
      "drinks", "drink", "pizza", "burger", "eat", "eating", "ate"
    ],
    Travel: [
      "travel", "trip", "taxi", "grab", "uber", "bus", "train", "flight",
      "flights", "fuel", "gas", "petrol", "parking", "transport", "transit",
      "hotel", "airbnb", "ticket", "tickets", "metro", "bts", "mrt"
    ],
    Bills: [
      "bill", "bills", "rent", "electricity", "electric", "water", "internet",
      "wifi", "phone", "mobile", "utilities", "utility", "subscription",
      "insurance", "loan", "mortgage", "tax", "taxes"
    ],
    Shopping: [
      "shopping", "clothes", "clothing", "shoes", "shirt", "dress", "amazon",
      "lazada", "shopee", "gadget", "gadgets", "electronics", "laptop",
      "phone case", "gift", "gifts"
    ],
    Entertainment: [
      "movie", "movies", "cinema", "netflix", "spotify", "game", "games",
      "gaming", "concert", "party", "entertainment", "bar", "club"
    ],
    Health: [
      "health", "doctor", "hospital", "clinic", "medicine", "pharmacy",
      "gym", "fitness", "dentist", "medical"
    ],
    Income: [
      "salary", "freelance", "freelancing", "bonus", "refund", "refunded",
      "income", "paycheck", "dividend", "dividends", "interest", "sold",
      "sale", "wage", "wages", "commission", "tip", "tips", "gift"
    ]
  };

  // Verbs / words that indicate money coming in.
  var INCOME_VERBS = [
    "earned", "earn", "received", "receive", "got", "get", "income",
    "made", "make", "sold", "deposited", "deposit", "credited", "refunded",
    "gained", "gain", "won", "win"
  ];

  // Verbs that indicate money going out.
  var EXPENSE_VERBS = [
    "spent", "spend", "paid", "pay", "bought", "buy", "purchased", "purchase",
    "expense", "cost", "withdrew", "withdraw", "charged"
  ];

  var FILLER_WORDS = [
    "on", "for", "from", "to", "a", "an", "the", "of", "at", "in", "my",
    "some", "today", "yesterday", "tonight", "this", "that", "with", "and",
    "baht", "thb", "dollars", "dollar", "usd", "rupees", "rupee", "euros",
    "euro", "eur", "bucks", "money", "cash", "about", "around", "roughly"
  ];

  function titleCase(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  // Extract the first monetary amount. Handles 1,250.50 / 150 / 5k etc.
  function extractAmount(text) {
    // Match an optional "k"/"m" suffix multiplier (e.g. "5k" = 5000).
    var match = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/i);
    if (!match) return null;
    var num = parseFloat(match[1].replace(/,/g, ""));
    if (isNaN(num)) return null;
    var suffix = (match[2] || "").toLowerCase();
    if (suffix === "k") num *= 1000;
    if (suffix === "m") num *= 1000000;
    return Math.round(num * 100) / 100;
  }

  function detectType(words) {
    for (var i = 0; i < words.length; i++) {
      if (INCOME_VERBS.indexOf(words[i]) !== -1) return "income";
    }
    for (var j = 0; j < words.length; j++) {
      if (EXPENSE_VERBS.indexOf(words[j]) !== -1) return "expense";
    }
    return null;
  }

  function detectCategory(words, type) {
    for (var category in CATEGORY_KEYWORDS) {
      if (!Object.prototype.hasOwnProperty.call(CATEGORY_KEYWORDS, category)) {
        continue;
      }
      var keywords = CATEGORY_KEYWORDS[category];
      for (var i = 0; i < words.length; i++) {
        if (keywords.indexOf(words[i]) !== -1) {
          return category;
        }
      }
    }
    if (type === "income") return "Income";
    return "Other";
  }

  // Build a readable description from the remaining meaningful words.
  function buildDescription(words) {
    var verbs = INCOME_VERBS.concat(EXPENSE_VERBS);
    var kept = words.filter(function (w) {
      if (/^\d/.test(w)) return false; // numbers / amounts
      if (verbs.indexOf(w) !== -1) return false;
      if (FILLER_WORDS.indexOf(w) !== -1) return false;
      return w.length > 0;
    });
    if (kept.length === 0) return "";
    return kept.map(function (w, i) {
      return i === 0 ? titleCase(w) : w;
    }).join(" ");
  }

  function parse(input) {
    if (!input || typeof input !== "string") return null;
    var text = input.trim();
    if (!text) return null;

    var amount = extractAmount(text);

    // Tokenise, stripping punctuation but keeping word characters.
    var words = text
      .toLowerCase()
      .replace(/[^\w\s.,]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    var type = detectType(words) || "expense";
    var category = detectCategory(words, type);
    var description = buildDescription(words);

    return {
      type: type,
      amount: amount,
      category: category,
      description: description
    };
  }

  return {
    parse: parse,
    CATEGORIES: ["Food", "Travel", "Bills", "Shopping", "Entertainment", "Health", "Income", "Other"]
  };
});
