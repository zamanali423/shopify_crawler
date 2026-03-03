import { load } from "cheerio";
import axios from "axios";

async function getStockStatusFromHtml(url) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);

    // This selector works for most Shopify themes
    const availabilityText = $("body").text().match(/Availability:\s*([A-Za-z ]+)/i);

    if (availabilityText && availabilityText[1]) {
      const status = availabilityText[1].trim();
      return status === "In stock" ? "InStock" : "OutOfStock";
    }

    // fallback: search for "Only X left in stock"
    const leftText = $("body").text().match(/Only\s+(\d+)\s+left\s+in\s+stock/i);
    if (leftText && leftText[1]) {
      return "InStock";
    }

    return "Unknown";
  } catch (e) {
    return "Unknown";
  }
}

export default getStockStatusFromHtml;