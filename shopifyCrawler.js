import axios from "axios";
import xml2js from "xml2js";
import fs from "fs";
import getStockStatusFromHtml from "./getStockStatusFromHtml.js";

const filePath = "product-response.json";
const parser = new xml2js.Parser();

/* ─────────────────────────────
   File Init
───────────────────────────── */
function initFile() {
  fs.writeFileSync(filePath, "[\n");
}
initFile();

/* ─────────────────────────────
   Helpers
───────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizeDomain(domain) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getHandleFromUrl(url) {
  return url.split("?")[0].split("/products/")[1];
}

/* ─────────────────────────────
   Store Checks
───────────────────────────── */
async function checkStore(storeDomain) {
  try {
    if(await checkJsonAccess(storeDomain)){
      return true;
    }

    await axios.get(`https://${storeDomain}/sitemap.xml`, { timeout: 8000 });

    return true;
  } catch {
    return false;
  }
}

async function checkJsonAccess(storeDomain) {
  try {
    if(storeDomain.endsWith('products.json')){
      storeDomain = storeDomain.replace('products.json', '');
    }
    const res = await axios.get(
      `https://${storeDomain}/products.json?limit=1`,
      { validateStatus: () => true }
    );
    return res.status === 200 && res.data?.products;
  } catch {
    return false;
  }
}

/* ─────────────────────────────
   Product URL Fetch (SITEMAP)
───────────────────────────── */
async function getProductUrlsFromSitemap(storeDomain) {
  try {
    const sitemapIndexUrl = `https://${storeDomain}/sitemap.xml`;
    const sitemapIndex = await axios.get(sitemapIndexUrl);
    const data = await parser.parseStringPromise(sitemapIndex.data);

    const productSitemaps = data.sitemapindex.sitemap
      .map(s => s.loc[0])
      .filter(l => l.includes("sitemap_products"));

    let urls = [];

    for (const sm of productSitemaps) {
      const xml = await axios.get(sm);
      const parsed = await parser.parseStringPromise(xml.data);
      const productUrls = parsed.urlset.url.map(u => u.loc[0]);
      urls.push(...productUrls);
    }
    console.log(`Found ${urls.length} product URLs from sitemap`);

    return [...new Set(urls)];
  } catch {
    return [];
  }
}

/* ─────────────────────────────
   Product Fetch (JSON PAGINATION)
───────────────────────────── */
async function getProductsFromJson(storeDomain) {
  let page = 1;
  let products = [];
  if(storeDomain.endsWith('products.json')){
    storeDomain = storeDomain.replace('products.json', '');
  }

  while (true) {
    
    const url = `https://${storeDomain}/products.json?limit=250&page=${page}`;
    const res = await axios.get(url, { validateStatus: () => true });

    if (res.status !== 200 || !res.data.products.length) break;

    products.push(...res.data.products);
    page++;
    await sleep(500);
  }
  console.log(`Found ${products.length} products from JSON pagination`);

  return products;
}

/* ─────────────────────────────
   Normalizer
───────────────────────────── */
function normalizeProduct(product, storeDomain, stockStatus) {
  return {
    source: {
      id: String(product.id),
      canonicalUrl: `https://${storeDomain}/products/${product.handle}`,
      retailer: storeDomain.split(".")[0],
      language: "en",
      currency: "USD",
      createdUTC: new Date(product.created_at).getTime(),
      updatedUTC: new Date(product.updated_at).getTime(),
      publishedUTC: new Date(product.published_at).getTime()
    },
    title: product.title,
    description: product.body_html,
    brand: product.vendor,
    tags: Array.isArray(product.tags)
  ? product.tags
  : typeof product.tags === "string"
    ? product.tags.split(",").map(t => t.trim())
    : [],

    variants: product.variants.map(v => ({
      id: String(v.id),
      title: v.title,
      sku: v.sku,
      price: {
        current: Number(v.price),
        previous: v.compare_at_price
          ? Number(v.compare_at_price)
          : null,
        stockStatus
      }
    })),
    images: product.images.map(img => ({
      id: String(img.id),
      url: img.src,
      alt: img.alt || ""
    }))
  };
}

/* ─────────────────────────────
   Append to File
───────────────────────────── */
function appendProductToFile(product) {
  const content = fs.readFileSync(filePath, "utf8").trim();
  const isEmpty = content === "[";

  fs.writeFileSync(
    filePath,
    content +
      (isEmpty ? "" : ",") +
      "\n" +
      JSON.stringify(product, null, 2)
  );
}

/* ─────────────────────────────
   Main Scraper
───────────────────────────── */
async function scrapeAllProducts(storeDomain) {
  storeDomain = normalizeDomain(storeDomain);

  if (!(await checkStore(storeDomain))) {
    return "❌ Store does not exist or is unavailable";
  }

  const jsonAllowed = await checkJsonAccess(storeDomain);
  let products = [];

  // 1️⃣ Try Sitemap First
  const urls = await getProductUrlsFromSitemap(storeDomain);

  if (urls.length) {
     console.log("📌 Using sitemap data");
    for (const url of urls) {
      try {
        const handle = getHandleFromUrl(url);
        const jsonUrl = `https://${storeDomain}/products/${handle}.json`;
        const res = await axios.get(jsonUrl);

        const stockStatus = await getStockStatusFromHtml(url);
        const normalized = normalizeProduct(
          res.data.product,
          storeDomain,
          stockStatus
        );

        products.push(normalized);
        appendProductToFile(normalized);
        console.log(`✅ Scraped product: ${normalized.title} - ${normalized.source.canonicalUrl} from sitemap`);
        await sleep(800);
      } catch {
        continue;
      }
    }
  }

  // 2️⃣ Fallback to products.json
  else if ( jsonAllowed) {
    const jsonProducts = await getProductsFromJson(storeDomain);
    for (const p of jsonProducts) {
      const stockStatus = "UNKNOWN";
      const normalized = normalizeProduct(p, storeDomain, stockStatus);
      products.push(normalized);
      appendProductToFile(normalized);
      console.log(`✅ Scraped product: ${normalized.title} - ${normalized.source.canonicalUrl} from products.json`);
    }
  }

  fs.appendFileSync(filePath, "\n]");
  console.log(`✅ Saved ${products.length} products to ${filePath}`);
  return products;
}

export default scrapeAllProducts;
