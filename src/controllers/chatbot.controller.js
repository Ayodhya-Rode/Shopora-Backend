import Product from "../models/Product.model.js";
import Order from "../models/Order.model.js";
import groq from "../config/groq.js";
import Fuse from "fuse.js";

const SYSTEM_PROMPT = `
You are a helpful customer support assistant for an online clothing store.

You must ALWAYS reply with ONLY valid JSON, no extra text, in one of these three shapes:

1. Direct answer:
{"action": "answer", "reply": "your reply here"}

2. Product search:
{"action": "search_products", "filters": {"keyword": "", "color": "", "minPrice": null, "maxPrice": null}}

Use "search_products" whenever the user asks about ANY product, product type, brand, category, price, size, color, stock, or availability.

IMPORTANT:
- "keyword" must contain ONLY the core product name/type/brand (e.g. "lehenga", "Nike shoes", "t-shirt").
- Do NOT put color words in "keyword" — color goes only in the "color" field.
- Do NOT put price phrases like "under 1000" in "keyword" — price goes only in minPrice/maxPrice.
- Do NOT include filler words like "for girl", "for women", "show me" in "keyword".
- Do NOT carry over price or color from a previous message unless the current message repeats it.
- Never assume that a product exists or does not exist in the store.
- Never ask the user to specify a product model before searching.
- The database will determine whether the requested product exists.

Examples:
  "Show me maroon lehenga for girl under 1000"
  → {"action":"search_products","filters":{"keyword":"lehenga","color":"maroon","minPrice":null,"maxPrice":1000}}

  "What sizes are available for Nike shoes?"
  → {"action":"search_products","filters":{"keyword":"Nike shoes","color":"","minPrice":null,"maxPrice":null}}

  "Do you have red dresses?"
  → {"action":"search_products","filters":{"keyword":"dresses","color":"red","minPrice":null,"maxPrice":null}}

Do not ask follow-up questions for product searches unless the user has not mentioned any product at all.

3. Order lookup:
{"action": "lookup_orders"}

Rules:
- Never invent product details, prices, or stock.
- Never invent order details.
- If a sizing/price/stock question doesn't name a product, ask which product they mean using the "answer" action.
- Keep replies short, friendly, and natural.
- If the user asks about a product that may or may not exist in the store, ALWAYS search the database first.
- Only say that a product is unavailable after the database search returns no matching products.
- Never use your general world knowledge to determine whether a product is sold by this store.
`;

// Color synonym groups so "red" also matches "maroon", "crimson", etc.
const COLOR_SYNONYMS = {
  red: ["red", "maroon", "crimson", "wine", "rust"],
  pink: ["pink", "rose", "magenta", "fuchsia"],
  blue: ["blue", "navy", "teal", "turquoise", "sky"],
  green: ["green", "olive", "mint", "lime"],
  yellow: ["yellow", "mustard", "gold"],
  black: ["black", "charcoal", "gray", "grey"],
  white: ["white", "cream", "ivory", "off-white"],
  brown: ["brown", "tan", "beige", "khaki"],
  purple: ["purple", "violet", "lavender"],
  orange: ["orange", "peach", "coral"],
};

function getColorMatches(color) {
  const lower = color.toLowerCase();
  for (const group of Object.values(COLOR_SYNONYMS)) {
    if (group.includes(lower)) return group;
  }
  return [lower];
}

// Ask Groq what action should be taken
async function getGeminiDecision(userMessage) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
    temperature: 0,
  });

  const text = completion.choices[0].message.content.trim();

  console.log("Groq decision:", text);

  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return {
      action: "answer",
      reply: text,
    };
  }
}

// Ask Groq to create final reply using DB data
async function getGeminiFinalReply(userMessage, contextLabel, contextData) {
  const prompt = `
You are a customer support assistant for an online clothing store.

User asked:
"${userMessage}"

${contextLabel}:
${JSON.stringify(contextData)}

IMPORTANT RULES:
- Answer ONLY using the data provided above.
- Never invent products, prices, sizes, colors, stock, or availability.
- If the data is an empty array, clearly tell the user that no matching product is currently available.
- If no product matches, DO NOT ask the user for a model, style, product code, or more details.
- Do not suggest that the product exists if the database returned no matching product.
- Keep the response short, natural, and helpful.
- Reply in plain text only.

If no products were found, give a response similar in meaning to:
"Sorry, we don't currently have a matching product available."
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
  });

  return completion.choices[0].message.content.trim();
}

// Search products
async function searchProducts(filters) {
  const baseQuery = {
    isActive: true,
  };

  let products = await Product.find(baseQuery)
    .select(
      "name brand description price discountPrice sizes colors stock category images",
    )
    .populate("category", "name")
    .limit(100);

  if (!products.length) {
    return [];
  }

  // Fuzzy keyword search — word by word, so extra/filler words don't break matching
  if (filters?.keyword) {
    const fuse = new Fuse(products, {
      keys: ["name", "brand", "description", "category.name"],
      threshold: 0.4,
      ignoreLocation: true,
    });

    const fillerWords = new Set([
      "for",
      "girl",
      "girls",
      "boy",
      "boys",
      "women",
      "men",
      "under",
      "show",
      "me",
      "the",
      "kids",
      "kid",
    ]);

    const words = filters.keyword
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1 && !fillerWords.has(w));

    const matchedIds = new Set();
    const merged = [];

    for (const word of words) {
      const results = fuse.search(word);
      for (const r of results) {
        const id = r.item._id.toString();
        if (!matchedIds.has(id)) {
          matchedIds.add(id);
          merged.push(r.item);
        }
      }
    }

    products =
      merged.length > 0
        ? merged
        : fuse.search(filters.keyword).map((r) => r.item);
  }

  // Filter by color — using synonym groups (e.g. "red" also matches "maroon")
  if (filters?.color) {
    const matches = getColorMatches(filters.color);
    const colorRegex = new RegExp(matches.join("|"), "i");

    products = products.filter((product) =>
      product.colors?.some((color) => colorRegex.test(color)),
    );
  }

  // Filter by price
  if (filters?.minPrice != null || filters?.maxPrice != null) {
    products = products.filter((product) => {
      const price = Number(product.discountPrice || product.price);

      if (filters.minPrice != null && price < Number(filters.minPrice)) {
        return false;
      }

      if (filters.maxPrice != null && price > Number(filters.maxPrice)) {
        return false;
      }

      return true;
    });
  }

  return products.slice(0, 10);
}

// Find user's orders
async function lookupOrders(userId) {
  const orders = await Order.find({
    user: userId,
  })
    .select("items orderStatus totalAmount createdAt")
    .sort({ createdAt: -1 })
    .limit(5);

  return orders;
}

// Main chatbot controller
export async function ChatWithBot(req, res) {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const decision = await getGeminiDecision(message);

    if (decision.action === "answer") {
      return res.status(200).json({
        success: true,
        message: "Reply generated",
        data: {
          reply: decision.reply,
        },
      });
    }

    if (decision.action === "search_products") {
      const products = await searchProducts(decision.filters);

      const reply = await getGeminiFinalReply(
        message,
        "Matching products found",
        products,
      );

      return res.status(200).json({
        success: true,
        message: "Reply generated",
        data: {
          reply,
          products: products.map((p) => ({
            _id: p._id,
            name: p.name,
            price: p.price,
            discountPrice: p.discountPrice,
            image: p.images?.[0]?.url || null,
          })),
        },
      });
    }

    if (decision.action === "lookup_orders") {
      if (!req.user || req.user.role !== "user") {
        return res.status(200).json({
          success: true,
          message: "Reply generated",
          data: {
            reply:
              "Please log in to your account so I can check your orders for you.",
          },
        });
      }

      const orders = await lookupOrders(req.user.id);

      const reply = await getGeminiFinalReply(
        message,
        "User's recent orders",
        orders,
      );

      return res.status(200).json({
        success: true,
        message: "Reply generated",
        data: {
          reply,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reply generated",
      data: {
        reply: "Sorry, I didn't quite understand that. Could you rephrase?",
      },
    });
  } catch (err) {
    console.log("Error in chatbot", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}
