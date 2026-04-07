import express from "express";
import * as cheerio from "cheerio";
import puppeteer from 'puppeteer';
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import ScrapedStore from './models/ScrapedStore.js';

dotenv.config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopify_crawler';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Save data to JSON
function saveStoreInfoToJSON(domain, data) {
  const folderPath = path.join(process.cwd(), 'scraped_data');
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  const safeDomain = domain.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filePath = path.join(folderPath, `${safeDomain}_${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return filePath;
}

// Save data to MongoDB
async function saveToMongoDB(domain, scrapedData, extractedData) {
  try {
    // Strip full_html from detail pages to stay under MongoDB's 16MB BSON limit
    const lightDetailPages = (scrapedData.detail_pages || []).map(dp => ({
      url: dp.url,
      product_html: dp.product_html ? dp.product_html.substring(0, 50000) : null,
      timestamp: dp.timestamp
    }));

    // Truncate product block HTML to reduce size
    const lightProducts = (scrapedData.products || []).map(p => ({
      ...p,
      productBlocks: (p.productBlocks || []).map(block => ({
        ...block,
        html: block.html ? block.html.substring(0, 10000) : null
      }))
    }));

    const doc = new ScrapedStore({
      domain: scrapedData.domain || domain,
      pages_checked: scrapedData.pages_checked,
      products_found: scrapedData.products_found,
      detail_pages_scraped: scrapedData.detail_pages_scraped,
      tracking: scrapedData.tracking,
      products: lightProducts,
      detail_pages: lightDetailPages,
      extracted_data: extractedData || null
    });

    const saved = await doc.save();
    console.log(`💾 Saved to MongoDB with ID: ${saved._id}`);
    return saved._id;
  } catch (error) {
    console.error(`❌ MongoDB save error: ${error.message}`);
    throw error;
  }
}

// Helper function to clean HTML by removing unnecessary elements
 function cleanHTML(html) {
  const $ = cheerio.load(html);
  
  console.log('🧹 Starting HTML cleaning...');
  console.log(`📏 Original HTML length: ${html.length} characters`);
  
  // Remove script tags and their content
  const scriptsBefore = $('script').length;
  $('script').remove();
  console.log(`🗑️  Removed ${scriptsBefore} script tags`);

    // Remove style tags
  const inputBefore = $('input').length;
  $('input').remove();
  console.log(`🎨 Removed ${inputBefore} input tags`);
  // Remove style tags
  const stylesBefore = $('style').length;
  $('style').remove();
  console.log(`🎨 Removed ${stylesBefore} style tags`);
  
  // Remove style tags
  const aBefore = $('a').length;
  $('a').remove();
  console.log(`🎨 Removed ${aBefore} a tags`);
  
  // Remove svgs
  const svgsBefore = $('svg').length;
  $('svg').remove();
  console.log(`🖼️  Removed ${svgsBefore} SVG elements`);
  
  // Remove images and image-related content
  const imagesBefore = $('img').length;
  $('img').remove();
  console.log(`📷 Removed ${imagesBefore} image elements`);
  
  // Remove srcset attributes (responsive images)
  const elementsWithSrcset = $('[srcset]').length;
  $('[srcset]').removeAttr('srcset');
  console.log(`🖼️  Removed ${elementsWithSrcset} srcset attributes`);
  
  // Remove data-image attributes (variant images)
  const elementsWithDataImage = $('[data-variant-image-src], [data-variant-image-srcset]').length;
  $('[data-variant-image-src], [data-variant-image-srcset]').removeAttr('data-variant-image-src').removeAttr('data-variant-image-srcset');
  console.log(`🎨 Removed ${elementsWithDataImage} data-image attributes`);
    // Remove all style attributes from all elements
  const elementsWithClass = $('[class]').length;
  $('[class]').removeAttr('class');
  console.log(`🎨 Removed ${elementsWithClass} class attributes`);
  
    const elementsWithFor = $('[for]').length;
  $('[for]').removeAttr('for');
  console.log(`🎨 Removed ${elementsWithFor} for attributes`);
  
  // Remove all style attributes from all elements
  const elementsWithStyles = $('[style]').length;
  $('[style]').removeAttr('style');
  console.log(`🎨 Removed ${elementsWithStyles} style attributes`);
  
  // Remove common navigation elements
  const navBefore = $('nav, .nav, .navigation, .navbar, .menu').length;
  $('nav, .nav, .navigation, .navbar, .menu').remove();
  console.log(`🧭 Removed ${navBefore} navigation elements`);
  
  // Remove header elements
  const headerBefore = $('header, .header, .top-header, .site-header').length;
  $('header, .header, .top-header, .site-header').remove();
  console.log(`📰 Removed ${headerBefore} header elements`);
  
  // Remove footer elements
  const footerBefore = $('footer, .footer, .site-footer').length;
  $('footer, .footer, .site-footer').remove();
  console.log(`📄 Removed ${footerBefore} footer elements`);
  
  // Remove sidebar elements
  const sidebarBefore = $('.sidebar, .side-bar, .widget-area').length;
  $('.sidebar, .side-bar, .widget-area').remove();
  console.log(`📂 Removed ${sidebarBefore} sidebar elements`);
  
  // Remove ads and popups
  const adsBefore = $('.ad, .ads, .advertisement, .popup, .modal').length;
  $('.ad, .ads, .advertisement, .popup, .modal').remove();
  console.log(`🚫 Removed ${adsBefore} ad/popup elements`);
  
  // Remove social media widgets
  const socialBefore = $('.social, .share, .follow').length;
  $('.social, .share, .follow').remove();
  console.log(`📱 Removed ${socialBefore} social media elements`);
  
  // Remove cookie banners
  const cookieBefore = $('.cookie, .consent, .banner').length;
  $('.cookie, .consent, .banner').remove();
  console.log(`🍪 Removed ${cookieBefore} cookie/banner elements`);
  
  // Remove hidden elements
  const hiddenBefore = $('[style*="display:none"], [hidden]').length;
  $('[style*="display:none"], [hidden]').remove();
  console.log(`👻 Removed ${hiddenBefore} hidden elements`);
  
  const cleanedHtml = $.html();
  console.log(`✅ Cleaning complete! Final HTML length: ${cleanedHtml.length} characters`);
  console.log(`📉 Size reduction: ${((html.length - cleanedHtml.length) / html.length * 100).toFixed(1)}%`);
  
  return cleanedHtml;
}

// SIMPLE: Check if link is internal
function isInternalLink(link, baseUrl) {
  try {
    const url = new URL(link, baseUrl);
    const base = new URL(baseUrl);
    
    // Same domain (with or without www)
    const baseHost = base.hostname.replace(/^www\./, '');
    const urlHost = url.hostname.replace(/^www\./, '');
    
    return baseHost === urlHost;
  } catch {
    return false;
  }
}

// ENHANCED: Check if page looks like a product page
function isProductPage($, url) {
  const urlLower = url.toLowerCase();
  
  // If URL has product patterns, it's a product page (highest confidence)
  const productPatterns = [
    '/product/', '/products/', '/p/', '/item/', '/shop/',
    'bl', 'cl',
    '/detail/', '/prod/', '/buy/', '/product-category/',
    '/collections/', '/collection/', '/category/', '/categories/',
    '/catalog/', '/c/'
  ];
  
  if (productPatterns.some(pattern => urlLower.includes(pattern))) {
    return true;
  }
  
  // Check for product indicators in page content
  const bodyText = $('body').text();
  const hasPrice = /\$|¤|£|â|¥|Rs\.?|\d+\.\d{2}/.test(bodyText);
  const hasAddToCart = $('button, a').text().toLowerCase().includes('add to cart') || 
                      $('button, a').text().toLowerCase().includes('buy now') ||
                      $('button, a').text().toLowerCase().includes('shop now');
  const hasProductTitle = $('h1, h2, .product-title, .product-name').length > 0;
  const hasProductImages = $('img[src*="product"], img[alt*="product"], .product-image img').length > 0;
  const hasProductSpecs = $('[class*="spec"], [class*="detail"], [class*="feature"]').length > 0;
  
  // Score-based approach - if it has multiple product indicators, it's likely a product page
  let score = 0;
  if (hasPrice) score += 3; // Price is strongest indicator
  if (hasAddToCart) score += 2;
  if (hasProductTitle) score += 1;
  if (hasProductImages) score += 1;
  if (hasProductSpecs) score += 1;
  
  // Consider it a product page if it has a score of 2 or more
  console.log(`Product page score: ${score}`);
  return score >= 2;
}

// SIMPLE: Normalize URL
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}
// ENHANCED: Extract product blocks and immediately scrape detail pages WITH SEQUENTIAL PROCESSING
async function extractProductBlocksWithDetails($, pageUrl, browser) {
  const blocks = [];
  const seenBlocks = new Set(); // Track unique blocks
  
  // Look for common product containers
  const selectors = [
    '.product', '.product-item', '.product-card', 
    '.item', '.card', '.shop-item', 'article',
    '[data-product-id]', '[class*="product-"]'
  ];
  
  try {
    // First pass: Extract all blocks and collect detail links
    const detailLinks = new Set();
    
    selectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = $el.text();
        
        // Check if this looks like a product
        const hasPrice = /\$|€|£|₹|¥|Rs\.?|\d+\.\d{2}/.test(text);
        const hasAddToCart = text.toLowerCase().includes('add to cart') || 
                            text.toLowerCase().includes('buy now');
        
        // If it looks like a product block (no image check since images are removed during cleaning)
        if (hasPrice || hasAddToCart) {
          // Get the HTML of just this block
          const html = $.html($el);
          
          // Create a fingerprint to identify duplicates
          const blockFingerprint = createBlockFingerprint($el);
          
          // Check if we've already seen this block
          if (seenBlocks.has(blockFingerprint)) {
            return; // Skip duplicate
          }
          
          seenBlocks.add(blockFingerprint);
          
          // Try to find detail link within this block
          let detailLink = null;
          
          // Look for product detail links in the block
          const $block = cheerio.load(html);
          const detailSelectors = [
            'a[href*="/product/"]',
            'a[href*="/products/"]',
            'a[href*="/p/"]',
            'a[href*="/item/"]',
            'a[href*="/prod/"]',
            'a[href*="/detail/"]',
            'a.view-details',
            'a.more-info',
            '.product-title a',
            '.product-name a',
            'h2 a', 'h3 a', 'h4 a'
          ];
          
          // Check each selector for a detail link
          for (const detailSelector of detailSelectors) {
            const link = $block(detailSelector).first();
            if (link.length) {
              const href = link.attr('href');
              if (href) {
                try {
                  detailLink = normalizeUrl(new URL(href, pageUrl).href);
                  if (isInternalLink(href, pageUrl)) {
                    detailLinks.add(detailLink);
                    break;
                  }
                } catch (e) {
                  // Skip invalid URLs
                }
              }
            }
          }
          
          // If no detail link found with selectors, check any link in the block
          if (!detailLink) {
            $block('a[href]').each((_, anchor) => {
              if (detailLink) return false; // Stop if we already found one
              
              const href = $block(anchor).attr('href');
              const linkText = $block(anchor).text().toLowerCase();
              
              if (href && (linkText.includes('view') || linkText.includes('details') || linkText.includes('more'))) {
                try {
                  const fullUrl = normalizeUrl(new URL(href, pageUrl).href);
                  if (isInternalLink(href, pageUrl)) {
                    detailLink = fullUrl;
                    detailLinks.add(detailLink);
                    return false; // Stop the loop
                  }
                } catch (e) {
                  // Skip invalid URLs
                }
              }
            });
          }
          
          // Clean HTML before saving
          // const cleanedHtml = cleanHTML(html);
          
          // Add block to results (only once!)
          blocks.push({
            page_url: pageUrl,
            detail_link: detailLink || null,
            fingerprint: blockFingerprint // For debugging
          });
        }
      });
    });
    
    // If no blocks found with selectors, try a broader search
    if (blocks.length === 0) {
      console.log('🔄 Using broader product search...');
      
      $('div, article, section, li').each((_, el) => {
        if (blocks.length >= 15) return; // Limit blocks per page
        
        const $el = $(el);
        
        // Skip very small elements
        if ($el.text().length < 20) return;
        
        // Check for product indicators
        const text = $el.text();
        const hasPrice = /\$|€|£|₹|¥|Rs\.?|\d+\.\d{2}/.test(text);
        const hasAddToCart = text.toLowerCase().includes('add to cart') || 
                            text.toLowerCase().includes('buy now');
        
        // If it looks like a product block 
        if (hasPrice || hasAddToCart) {
          const html = $.html($el);
          
          // Create a fingerprint to identify duplicates
          const blockFingerprint = createBlockFingerprint($el);
        
          // Check if we've already seen this block
          if (seenBlocks.has(blockFingerprint)) {
            return; // Skip duplicate
          }
          
          seenBlocks.add(blockFingerprint);
          
          // Try to find detail link
          let detailLink = null;
          
          const $block = cheerio.load(html);
          
          // Check for detail links
          $block('a[href]').each((_, anchor) => {
            const href = $block(anchor).attr('href');
            if (href && (href.includes('/product/') || href.includes('/p/') || href.includes('/item/'))) {
              try {
                detailLink = normalizeUrl(new URL(href, pageUrl).href);
                if (isInternalLink(href, pageUrl)) {
                  detailLinks.add(detailLink);
                  return false; // Stop the loop
                }
              } catch (e) {
                // Skip invalid URLs
              }
            }
          });
          
          // Add the block to results (only once!)
          blocks.push({
            html: html,
            page_url: pageUrl,
            detail_link: detailLink || null,
            fingerprint: blockFingerprint
          });
        }
      });
    }
    
    console.log(`📦 Found ${blocks.length} product blocks with ${detailLinks.size} unique detail links`);
    
    return {
      blocks: blocks,
      detail_links: detailLinks
    };
    
  } catch (error) {
    console.error(`❌ Error in extractProductBlocksWithDetails: ${error.message}`);
    return {
      blocks: blocks,
      detail_links: []
    };
  }
}
// Helper function to create a fingerprint for duplicate detection
function createBlockFingerprint($el) {
  // Extract key identifying information
  const productId = $el.attr('data-product-id') || 
                   $el.attr('id') || 
                   $el.find('[data-product-id]').attr('data-product-id');
  
  const productUrl = $el.find('a[href*="/product/"]').attr('href') ||
                    $el.find('a[href*="/products/"]').attr('href') ||
                    $el.find('a[href*="/p/"]').attr('href');
  
  const productTitle = $el.find('.product-title').text() ||
                      $el.find('h2').text() ||
                      $el.find('h3').text();
  

  
  // Create a fingerprint based on unique identifiers
  if (productId) {
    return `id:${productId}`;
  } else if (productUrl) {
    return `url:${productUrl}`;
  } else if (productTitle) {
    // Use first 50 chars of title as fingerprint
    return `title:${productTitle.substring(0, 50).toLowerCase().replace(/\s+/g, '_')}`;
  }
  
  // Fallback: use a hash of the HTML content
  const html = $el.html();
  return `hash:${simpleHash(html)}`;
}

// Simple hash function
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}


// Updated parallel scraping function with progress tracking
async function scrapeDetailPagesInParallel(links, browser, concurrency = 5, callbacks = {}) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  const totalLinks = links.length;
  
  // Create batches for parallel processing
  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (link) => {
      try {
        const result = await scrapeDetailPage(link, browser);
        successCount++;
        
        // Call progress callback if provided
        if (callbacks.onProgress) {
          callbacks.onProgress(successCount, failedCount, totalLinks);
        }
        
        return result;
      } catch (error) {
        failedCount++;
        console.log(`❌ Failed to scrape detail page ${link}: ${error.message}`);
        
        // Call progress callback if provided
        if (callbacks.onProgress) {
          callbacks.onProgress(successCount, failedCount, totalLinks);
        }
        
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
    
    // Small delay between batches to be respectful
    if (i + concurrency < links.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Helper function to scrape a single detail page
async function scrapeDetailPage(url, browser, taskNumber = 1) {
  try {
    console.log(`📄 [Task ${taskNumber}] Scraping: ${url}`);
    
    // Create a new page for this request
    const detailPage = await browser.newPage();
    
    // Set reasonable timeouts
    await detailPage.setDefaultNavigationTimeout(30000);
    await detailPage.setDefaultTimeout(10000);
    
    try {
      // Navigate to the page
      await Promise.race([
        detailPage.goto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 30000)
        )
      ]);
      
      // Brief wait for dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Extract product content using targeted selectors first, then smart heuristic
      const productContent = await detailPage.evaluate(() => {
        // Step 1: Try known product detail selectors (most reliable)
        const productSelectors = [
          '[data-product]', '[data-product-id]',
          '.product-detail', '.product-details', '.product-info',
          '.product-single', '.product__info-wrapper',
          '.pdp-main', '.pdp-container', '.product-page',
          '#product-detail', '#product-info', '#ProductInfo',
          'main .product', 'main [class*="product"]',
          '.product-section', '.product-content',
          '[itemtype*="Product"]'
        ];
        
        for (const selector of productSelectors) {
          const el = document.querySelector(selector);
          if (el && el.outerHTML.length > 200 && el.outerHTML.length < 100000) {
            return el.outerHTML;
          }
        }
        
        // Step 2: Smart heuristic — score elements but penalize overly large ones
        const candidates = Array.from(document.querySelectorAll('div, article, section'));
        
        const scoredElements = candidates.map(element => {
          const text = element.textContent;
          const textLen = text.length;
          const lowerText = text.toLowerCase();
          let score = 0;
          
          // Price patterns - highest priority
          if (/\$\d+|\¤\d+|£\d+|â[\d,]+|\d+\.\d{2}/.test(text)) score += 10;
          
          // Add to cart / buy buttons
          if (lowerText.includes('add to cart') || lowerText.includes('buy now')) score += 4;
          
          // Product title (h1 inside this element)
          if (element.querySelector('h1')) score += 3;
          
          // Description-like content
          if (element.querySelector('[class*="description"], [class*="details"], [class*="spec"]')) score += 2;
          
          // Penalize elements that are too broad (nav, header, footer inside)
          if (element.querySelector('nav, header, footer')) score -= 5;
          
          // Penalize very large elements (prefer focused containers)
          if (textLen > 10000) score -= 2;
          if (textLen > 20000) score -= 3;
          
          return { element, score };
        });
        
        scoredElements.sort((a, b) => b.score - a.score);
        const best = scoredElements[0];
        if (best && best.score > 3) {
          return best.element.outerHTML;
        }
        
        // Step 3: Last resort — get the <main> content or body with a size cap
        const main = document.querySelector('main') || document.querySelector('[role="main"]');
        if (main) {
          return main.outerHTML.substring(0, 50000);
        }
        
        return document.body.innerHTML.substring(0, 30000);
      });
      
      // Clean the product content before returning
      const cleanedContent = cleanHTML(productContent);
      
      return {
        url: url,
        product_html: cleanedContent,
        timestamp: new Date().toISOString()
      };
      
    } finally {
      // Always close the page
      await detailPage.close();
    }
    
  } catch (error) {
    console.log(`⚠ [Task ${taskNumber}] Error: ${url} - ${error.message}`);
    throw error; // Let Promise.allSettled handle it
  }
}
// UPDATED MAIN FUNCTION: Now includes detail page scraping with better error handling
export async function scrapeStoreProductsWithDetails(domain, maxPages = 20) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  const page = await browser.newPage();
  
  const visited = new Set();
  const products = [];
  const allDetailLinks = new Set(); // Collect all detail links first
  const allDetailPages = [];

   // Tracking variables
  let totalLinksFound = 0;
  let validLinks = 0;
  let skippedLinks = 0;
  let errorLinks = 0;
  let productPagesFound = 0;
  let nonProductPages = 0;
  let productBlocksTotal = 0;
  let detailLinksTotal = 0;
  let duplicateDetailLinks = 0;
  
  try {
    // Prepare base URL
    let baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    
    // Step 1: Load homepage and get links
    console.log(`🌐 Loading homepage: ${baseUrl}`);
    await page.goto(baseUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000   
    });
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Get homepage content
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Step 2: Collect all internal links
    const links = new Set();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && isInternalLink(href, baseUrl)) {
        const fullUrl = normalizeUrl(new URL(href, baseUrl).href);
        links.add(fullUrl);
      }
    });
     totalLinksFound = links.size;
    console.log(`📊 Found ${totalLinksFound} links on homepage`);
    
    // Convert to array and take only maxPages
    const linksToCrawl = Array.from(links).slice(0, maxPages);
    
    // Step 3: Crawl each link and extract product blocks WITH details
    for (const link of linksToCrawl) {
      if (visited.has(link)) {
        console.log(`⏭️  Already visited: ${link}`);
        skippedLinks++;
        continue;
      }
      visited.add(link);
      
      console.log(`\n🔍 [${visited.size}/${linksToCrawl.length}] Checking: ${link}`);
      
      try {
        await page.goto(link, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const pageHtml = await page.content();
        const $page = cheerio.load(pageHtml);
        
        // Check if this is a product page
        if (isProductPage($page, link)) {
          console.log(`🎯 Product page detected`);
          productPagesFound++;
          validLinks++;
          // Extract product blocks AND detail pages
          const result = await extractProductBlocksWithDetails($page, link, browser);
          
          if (result.blocks.length > 0) {
             productBlocksTotal += result.blocks.length;
            detailLinksTotal += result.detail_links.size;
             // Track duplicates specifically
            let newLinksThisPage = 0;
            let duplicatesThisPage = 0;
            
            result.detail_links.forEach(link => {
              if (allDetailLinks.has(link)) {
                duplicatesThisPage++;
                duplicateDetailLinks++;
              } else {
                newLinksThisPage++;
                allDetailLinks.add(link);
              }
            });
            
            products.push({
              url: link,
              productBlocks: result.blocks,
              page_type: 'product_page',
              stats: {
                blocks: result.blocks.length,
                detail_links_found: result.detail_links.size,
                new_detail_links: newLinksThisPage,
                duplicate_detail_links: duplicatesThisPage
              }
            });
               console.log(`📦 Found ${result.blocks.length} product blocks with ${result.detail_links.size} detail links`);
            console.log(`🔗 New detail links: ${newLinksThisPage}, Duplicates: ${duplicatesThisPage}`);
            console.log(`📊 Running total: ${productBlocksTotal} blocks, ${allDetailLinks.size} unique detail links (${duplicateDetailLinks} duplicates filtered)`);
          } else {
            console.log(`⛔ No product blocks found`);
          }
        } else {
          console.log(`📄 Not a product page, skipping`);
          nonProductPages++;
          skippedLinks++;
        }
        
        // Add delay between page visits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
       console.log(`❌ Error loading ${link}: ${err.message}`);
        errorLinks++;
      }
    }
   // Print intermediate summary before detail scraping
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCT PAGE CRAWLING COMPLETE');
    console.log('='.repeat(60));
    console.log(`🔗 Total links found: ${totalLinksFound}`);
    console.log(`🔗 Links crawled: ${linksToCrawl.length}`);
    console.log(`✅ Valid product pages: ${productPagesFound}`);
    console.log(`📄 Non-product pages: ${nonProductPages}`);
    console.log(`❌ Error pages: ${errorLinks}`);
    console.log(`📦 Total product blocks: ${productBlocksTotal}`);
    console.log(`🔗 Detail links found: ${detailLinksTotal}`);
    console.log(`🆕 Unique detail links: ${allDetailLinks.size}`);
    console.log(`🔄 Duplicate detail links filtered: ${duplicateDetailLinks}`);
    const deduplicationRate = detailLinksTotal > 0 ? ((duplicateDetailLinks / detailLinksTotal) * 100).toFixed(1) : 0;
    console.log(`📈 Deduplication rate: ${deduplicationRate}%`);
    console.log('='.repeat(60));


    // Step 4: NOW scrape all detail pages IN PARALLEL
    const uniqueDetailLinks = Array.from(allDetailLinks);
    let detailPagesScraped = 0;
    let detailPagesFailed = 0;
    if (uniqueDetailLinks.length > 0) {
      console.log(`\n📊 Starting parallel detail page scraping...`);
      console.log(`🔗 Total unique detail links: ${uniqueDetailLinks.length}`);
      
      // Scrape detail pages in parallel (3 concurrent by default)
      const detailPages = await scrapeDetailPagesInParallel(uniqueDetailLinks.slice(0,10), browser, 5,{
        onProgress: (success, failed, total) => {
          detailPagesScraped = success;
          detailPagesFailed = failed;
          const progress = ((success + failed) / total * 100).toFixed(1);
          console.log(`📈 Detail pages: ${success}/${total} (${progress}%) - ${failed} failed`);
        }
      });
      allDetailPages.push(...detailPages);
    }
     // Print final comprehensive summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL CRAWLING SUMMARY');
    console.log('='.repeat(60));
    console.log(`🌐 Domain: ${baseUrl}`);
    console.log(`🔗 Links analyzed: ${linksToCrawl.length}`);
    console.log(`🎯 Product pages found: ${productPagesFound}`);
    console.log(`📦 Product blocks extracted: ${productBlocksTotal}`);
    console.log(`🔗 Detail links identified: ${detailLinksTotal}`);
    console.log(`🔄 Duplicates filtered: ${duplicateDetailLinks}`);
    console.log(`🆕 Unique detail pages: ${allDetailLinks.size}`);
    console.log(`📄 Detail pages successfully scraped: ${detailPagesScraped}`);
    console.log(`❌ Detail pages failed: ${detailPagesFailed}`);
    const successRate = allDetailLinks.size > 0 ? ((detailPagesScraped / allDetailLinks.size) * 100).toFixed(1) : 0;
    console.log(`🏁 Success rate: ${successRate}%`);
    console.log('='.repeat(60));
     return {
      domain: baseUrl,
      pages_checked: visited.size,
      products_found: products.length,
      detail_pages_scraped: allDetailPages.length,
      tracking: {
        total_links_found: totalLinksFound,
        links_crawled: linksToCrawl.length,
        valid_links: validLinks,
        skipped_links: skippedLinks,
        error_links: errorLinks,
        product_pages: productPagesFound,
        non_product_pages: nonProductPages,
        product_blocks_total: productBlocksTotal,
        detail_links_found: detailLinksTotal,
        duplicate_detail_links: duplicateDetailLinks,
        unique_detail_links: allDetailLinks.size,
        deduplication_rate: deduplicationRate,
        detail_pages_success: detailPagesScraped,
        detail_pages_failed: detailPagesFailed,
        detail_pages_success_rate: successRate,
        per_page_stats: products.map(p => ({
          url: p.url,
          blocks: p.stats?.blocks || 0,
          detail_links: p.stats?.detail_links_found || 0,
          new_links: p.stats?.new_detail_links || 0,
          duplicate_links: p.stats?.duplicate_detail_links || 0
        }))
      },
      products: products,
      detail_pages: allDetailPages
    };
    
  } finally {
    await browser.close();
  }
}

// Extract data from a single page using AI
async function extractDataFromSinglePage(pageUrl, htmlContent) {
  const API_KEY = process.env.API_KEY;
  
  if (!API_KEY) {
    return {
      source_url: pageUrl,
      error: 'No API key available'
    };
  }
  
  const prompt = `
You are an expert e-commerce product data extractor. Extract product data from this HTML.

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. Extract ONLY what's visible in the HTML
3. For prices: extract text EXACTLY as shown
4. If a field is NOT present, return null

PAGE URL: ${pageUrl}
HTML CONTENT: ${htmlContent}

INSTRUCTIONS:
Extract ONLY what's actually present in the HTML:
1. product_title (string) - Title if visible
2. product_price (string) - Price EXACTLY as shown (include sale/discount info if present)
3. product_description (string) - Description text if present
4. product_brand (string) - Brand if visible
5. product_category (string) - Category if visible
6. product_specifications (array) - Specs if present (size, weight, material, etc.)
7. product_features (array) - Features/bullet points if present
8. product_rating (string) - Rating/review count if visible
9. product_availability (string) - Stock status if present

RETURN RESPONSE IN THIS EXACT JSON FORMAT:
{
  "source_url": "${pageUrl}",
  "product_title": "Product Name",
  "product_price": "$59.00 (was $100.00)",
  "product_description": "Product description...",
  "product_brand": "Brand Name",
  "product_category": "Category",
  "product_specifications": ["Size: XL", "Material: Cotton"],
  "product_features": ["Feature 1", "Feature 2"],
  "product_rating": "4.8/5 (6,911 reviews)",
  "product_availability": "In Stock"
}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "gpt-4",
        "messages": [{ 
          "role": "user", 
          "content": prompt 
        }],
        "temperature": 0.1,
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI extraction failed for ${pageUrl}:`, response.status, errorText);
      return {
        source_url: pageUrl,
        error: `API request failed: ${response.status}`
      };
    }
    
    const result = await response.json();
    const aiResponse = result.choices[0].message.content;
    
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.error(`❌ Failed to parse AI response for ${pageUrl}:`, parseError.message);
      return {
        source_url: pageUrl,
        error: "Failed to parse AI response",
        raw_response: aiResponse.substring(0, 200)
      };
    }
  } catch (error) {
    console.error(`❌ Error extracting data from ${pageUrl}:`, error.message);
    return {
      source_url: pageUrl,
      error: error.message
    };
  }
}

// Save extracted data to JSON file
function saveExtractedDataToJSON(domain, extractedData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${domain.replace(/[^a-zA-Z0-9]/g, '_')}_extracted_${timestamp}.json`;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const filepath = path.join(__dirname, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(extractedData, null, 2));
    console.log(`💾 Extracted data saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Failed to save extracted data:', error);
    return null;
  }
}

// API Endpoint
app.post('/scrape-store', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    console.log(`\n🚀 Scraping: ${domain}`);
    
    // Step 1: Scrape website
    const scrapedData = await scrapeStoreProductsWithDetails(domain);
    
    // Step 2: Save raw data
    const rawFilePath = saveStoreInfoToJSON(domain, scrapedData);
    
    // // Enable AI extraction
    let extractedData = [];
    let aiError = null;
    
    try {
      console.log(`Processing ${scrapedData.detail_pages.length} detail pages with AI...`);
      
      // Process each detail page individually
      for (let i = 0; i < scrapedData.detail_pages.length; i++) {
        const detailPage = scrapedData.detail_pages[i];
        
        try {
          console.log(`Extracting data from page ${i + 1}/${scrapedData.detail_pages.length}: ${detailPage.url}`);
          
          // Clean HTML before sending to AI
          const cleanedContent = cleanHTML(detailPage.product_html);
          const pageExtraction = await extractDataFromSinglePage(detailPage.url, cleanedContent);
          
          extractedData.push({
            page_number: i + 1,
            source_url: detailPage.url,
            extracted_data: pageExtraction
          });
          
          console.log(`Page ${i + 1} extraction complete`);
          
          // Add small delay between AI calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (pageError) {
          console.error(`Failed to extract from page ${i + 1}:`, pageError.message);
          extractedData.push({
            page_number: i + 1,
            source_url: detailPage.url,
            error: pageError.message
          });
        }
      }
      
      console.log(`AI extraction complete for all pages`);
    } catch (aiError) {
      console.error('AI extraction failed, but continuing:', aiError.message);
      extractedData = [{
        error: "AI extraction failed",
        error_details: aiError.message
      }];
    }
    
    // // Step 4: Save extracted data
    const extractedFilePath = saveExtractedDataToJSON(domain, extractedData);
    
    // Step 3: Save to MongoDB (raw data and extracted data)
    // const mongoId = await saveToMongoDB(domain, scrapedData);
    
    // Step 4: Return results
    res.json({
      success: true,
      domain: domain,
      // mongo_id: mongoId,
      stats: {
        pages_scraped: scrapedData.pages_checked,
        product_pages_found: scrapedData.products_found,
        total_blocks: scrapedData.products.reduce((sum, p) => sum + p.productBlocks.length, 0)
      },
      extracted_data: extractedData,
      detail_pages: scrapedData.detail_pages.slice(0, 10), // Return first 10 detail pages
      files: {
        raw_data: rawFilePath
      }
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Scraping failed', 
      details: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Store scraper running on port ${PORT}`);
  console.log(`📤 POST /scrape-store with { "domain": "example.com" }`);
});