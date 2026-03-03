import express from "express";
import scrapeAllProducts from "./shopifyCrawler.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.post("/scrape", async (req, res) => {
  const { storeDomain } = req.body;
  const products = await scrapeAllProducts(storeDomain);
  res.json(products);
});
async function callOpenRouterXiomi() {
   const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
   // Preserve the assistant message with reasoning_details
const messages = [
  {
    role: 'user',
    content: "Welcome to the store!",
  },
  {
    role: 'assistant',
    content: "Welcome to the store!",
    reasoning_details: null, // Pass back unmodified
  },
  {
    role: 'user',
    content: "Are you sure? Think carefully.",
  },
];
   let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "xiaomi/mimo-v2-flash:free",
      "messages": messages,  // Includes preserved reasoning_details
      // "reasoning": {"enabled": true}
    })
  });
  const result = await response.json();
  return result.choices[0].message;
}

// Call the function directly
callOpenRouterXiomi().then(response => {
  console.log("OpenRouter response:", response);
}).catch(error => {
  console.error("Error calling OpenRouter:", error);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
