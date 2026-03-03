import express from "express";
import * as cheerio from "cheerio";
import puppeteer from 'puppeteer';
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

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

// SIMPLE: Check if page looks like a product page
function isProductPage($, url) {
  const urlLower = url.toLowerCase();
  
  // If URL has product patterns, it's a product page
  const productPatterns = [
    '/product/', '/products/', '/p/', '/item/', '/shop/',
    '/detail/', '/prod/', '/buy/', '/product-category/'
  ];
  
  if (productPatterns.some(pattern => urlLower.includes(pattern))) {
    return true;
  }
  
  // OR check for price and add-to-cart
  const hasPrice = /\$|€|£|₹|¥|Rs\.?|\d+\.\d{2}/.test($('body').text());
  const hasAddToCart = $('button, a').text().toLowerCase().includes('add to cart');
  
  return hasPrice && hasAddToCart;
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
        
        // Also check for images in the element
        const hasImages = $el.find('img[src]').length > 0;
        
        // If it looks like a product block
        if (hasImages && (hasPrice || hasAddToCart)) {
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
          
          // Add the block to results (only once!)
          blocks.push({
            html: html,
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
        const hasImages = $el.find('img[src]').length > 0;
        
        if (hasImages && hasPrice) {
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
  
  const productImage = $el.find('img[src]').attr('src');
  
  // Create a fingerprint based on unique identifiers
  if (productId) {
    return `id:${productId}`;
  } else if (productUrl) {
    return `url:${productUrl}`;
  } else if (productTitle) {
    // Use first 50 chars of title as fingerprint
    return `title:${productTitle.substring(0, 50).toLowerCase().replace(/\s+/g, '_')}`;
  } else if (productImage) {
    // Use image filename as fingerprint
    const imageName = productImage.split('/').pop();
    return `image:${imageName}`;
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
async function scrapeDetailPagesInParallel(links, browser, concurrency = 3, callbacks = {}) {
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
      await new Promise(resolve => setTimeout(resolve, 500));
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
    await detailPage.setDefaultNavigationTimeout(20000);
    await detailPage.setDefaultTimeout(15000);
    
    try {
      // Navigate to the page
       await Promise.race([
      await detailPage.goto(url, { 
        waitUntil: 'domcontentloaded', 
         timeout: 30000,
      }),
       new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Navigation timeout')), 35000)
      )
    ]);
      
      // Wait a bit for page to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Extract product content using the generic method
      const productContent = await detailPage.evaluate(() => {
        // Simple heuristic: find element with price and images
        const allElements = Array.from(document.querySelectorAll('div, article, section, main'));
        
        // Score each element
        const scoredElements = allElements.map(element => {
          const text = element.textContent.toLowerCase();
          let score = 0;
          
          // Price patterns
          if (/\$\d+|\d+\.\d{2}/.test(text)) score += 5;
          
          // Add to cart buttons
          if (element.textContent.toLowerCase().includes('add to cart')) score += 3;
          
          // Product images
          const images = element.querySelectorAll('img');
          if (images.length > 0) score += images.length;
          
          // Product title
          if (element.querySelector('h1, h2.product-title')) score += 2;
          
          return { element, score };
        });
        
        // Get element with highest score
        scoredElements.sort((a, b) => b.score - a.score);
        return scoredElements[0]?.score > 0 ? scoredElements[0].element.outerHTML : null;
      });
      
      // Get full HTML as fallback
      const fullHtml = await detailPage.content();
      
      return {
        url: url,
        product_html: productContent || fullHtml,
        full_html: fullHtml,
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
    console.log(`📈 Deduplication rate: ${((duplicateDetailLinks / detailLinksTotal) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));


    // Step 4: NOW scrape all detail pages IN PARALLEL
    const uniqueDetailLinks = Array.from(allDetailLinks);
    let detailPagesScraped = 0;
    let detailPagesFailed = 0;
    if (uniqueDetailLinks.length > 0) {
      console.log(`\n📊 Starting parallel detail page scraping...`);
      console.log(`🔗 Total unique detail links: ${uniqueDetailLinks.length}`);
      
      // Scrape detail pages in parallel (3 concurrent by default)
      const detailPages = await scrapeDetailPagesInParallel(uniqueDetailLinks, browser, 5,{
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
    console.log(`🏁 Success rate: ${((detailPagesScraped / allDetailLinks.size) * 100).toFixed(1)}%`);
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
        deduplication_rate: detailLinksTotal > 0 ? (duplicateDetailLinks / detailLinksTotal) * 100 : 0,
        detail_pages_success: detailPagesScraped,
        detail_pages_failed: detailPagesFailed,
        detail_pages_success_rate: allDetailLinks.size > 0 ? (detailPagesScraped / allDetailLinks.size) * 100 : 0,
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

// Enhanced AI Extraction Function to process both product blocks and detail pages
async function extractDataWithAI(scrapedData) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    console.log('⚠️ OpenRouter API key not found, skipping AI extraction');
    return {
      extracted_products: [],
      extracted_details: [],
      note: 'AI extraction skipped - no API key'
    };
  }
  
  // VALIDATION: Check if we have any data to analyze
  if (!scrapedData) {
    console.log('⚠️ No scraped data provided');
    return {
      extracted_products: [],
      extracted_details: [],
      note: 'No scraped data provided'
    };
  }
  
  // Initialize arrays for processing
  const productBlocksData = [];
  const detailPagesData = [];
  
  // ========== PROCESS PRODUCT BLOCKS ==========
  if (scrapedData.products && Array.isArray(scrapedData.products) && scrapedData.products.length > 0) {
    console.log(`📦 Processing ${scrapedData.products.length} product pages for AI...`);
    
    for (const page of scrapedData.products.slice(0, 3)) { // Limit to 3 pages
      try {
        if (!page || typeof page !== 'object') continue;
        
        const pageUrl = page.url || 'unknown_url';
        const productBlocks = page.productBlocks;
        
        if (!productBlocks || !Array.isArray(productBlocks)) continue;
        
        // Process HTML blocks with validation
        const htmlBlocks = [];
        for (const block of productBlocks.slice(0, 2)) { // Limit to 2 blocks per page
          try {
            if (!block || typeof block !== 'object') continue;
            
            // Extract HTML snippet safely
            let htmlSnippet = '';
            if (block.html && typeof block.html === 'string') {
              htmlSnippet = block.html.substring(0, 1500); // Smaller limit for product blocks
            }
            
            if (htmlSnippet.length < 50) continue;
            
            htmlBlocks.push({
              html_snippet: htmlSnippet,
              block_type: 'product_block',
              has_detail_link: !!block.detail_link
            });
          } catch (blockError) {
            console.log(`⚠️ Error processing block: ${blockError.message}`);
            continue;
          }
        }
        
        if (htmlBlocks.length > 0) {
          productBlocksData.push({
            source_type: 'product_page',
            source_url: pageUrl,
            html_blocks: htmlBlocks
          });
        }
      } catch (pageError) {
        console.log(`⚠️ Error processing product page: ${pageError.message}`);
        continue;
      }
    }
  }
  
  // ========== PROCESS DETAIL PAGES ==========
  if (scrapedData.detail_pages && Array.isArray(scrapedData.detail_pages) && scrapedData.detail_pages.length > 0) {
    console.log(`🔗 Processing ${scrapedData.detail_pages.length} detail pages for AI...`);
    
    for (const detailPage of scrapedData.detail_pages.slice(0, 5)) { // Limit to 5 detail pages
      try {
        if (!detailPage || typeof detailPage !== 'object') continue;
        
        const pageUrl = detailPage.url || 'unknown_url';
        const pageContent = detailPage.product_html;
        
        if (!pageContent || typeof pageContent !== 'string') continue;
        
        // Extract HTML content from detail page
        let htmlContent = pageContent.substring(0, 3000); // Limit size for detail pages
        
        if (htmlContent.length < 100) continue;
        
        detailPagesData.push({
          source_type: 'detail_page',
          source_url: pageUrl,
          html_content: htmlContent
        });
      } catch (detailError) {
        console.log(`⚠️ Error processing detail page: ${detailError.message}`);
        continue;
      }
    }
  }
  
  // Check if we have any data to process
  if (productBlocksData.length === 0 && detailPagesData.length === 0) {
    console.log('⚠️ No valid data to send to AI');
    return {
      extracted_products: [],
      extracted_details: [],
      note: 'No valid data for AI extraction'
    };
  }
  
  console.log(`🤖 Sending to AI:`);
  console.log(`   📦 ${productBlocksData.length} product pages`);
  console.log(`   🔗 ${detailPagesData.length} detail pages`);
  
  const totalBlocks = productBlocksData.reduce((sum, page) => sum + page.html_blocks.length, 0);
  console.log(`   📊 ${totalBlocks} product blocks`);
  
  // Enhanced AI prompt with better price extraction instructions
const prompt = `
You are an expert e-commerce product data extractor specializing in perfumes and fragrances.

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. Extract ALL information visible in the HTML
3. For prices: ALWAYS extract the visible price text exactly as shown

DATA PROVIDED:
${JSON.stringify({
  product_blocks_data: productBlocksData,
  detail_pages_data: detailPagesData
}, null, 2)}

INSTRUCTIONS:

FOR PRODUCT BLOCKS (html_blocks array):
For EACH HTML snippet, extract:
1. product_title (string) - Extract the FULL product name
2. product_price (string) - Extract price text EXACTLY as shown including:
   - Currency symbols: $, €, £, ₹, AED, SAR, etc.
   - Sale price if available (look for: sale, discount, offer)
   - Regular price if sale price shown
   - Format: "$59.00", "AED 199", "€45.99 (was €59.99)"
3. product_brand (string) - Brand name (Paco Rabanne, Dior, etc.)
4. product_volume (string) - Size/volume (100ML, 50ml, etc.)
5. product_type (string) - EDT, EDP, Cologne, Perfume
6. product_features (array) - Extract ALL visible features

FOR DETAIL PAGES (html_content):
Extract COMPLETE product information:
1. product_title (string) - Full title
2. product_price (string) - Price EXACTLY as shown with ALL details:
   - Current price
   - Original price if crossed out
   - Discount percentage
   - Any price text like "Special Price", "Limited Offer"
3. product_description (string) - ALL descriptive text
4. product_brand (string) - Brand information
5. product_specifications (array) - All specs found
6. product_images (array) - Image URLs
7. product_features (array) - ALL features/bullet points
8. product_rating (string) - Rating and review count
9. product_availability (string) - Stock status

PRICE EXTRACTION EXAMPLES:
- If HTML shows: "<span class='price'>$59.00</span>", extract: "$59.00"
- If HTML shows: "<span class='old-price'>$100.00</span> <span class='sale-price'>$59.00</span>", extract: "$59.00 (was $100.00)"
- If HTML shows: "AED 199 <del>AED 299</del> 33% OFF", extract: "AED 199 (was AED 299) 33% OFF"
- If HTML shows currency in text: "Price: ₹2,499", extract: "₹2,499"
- If multiple prices: extract the most prominent/current price

CRITICAL: Extract price text EXACTLY as it appears, don't reformat or calculate.

RETURN RESPONSE IN THIS EXACT JSON FORMAT:
{
  "extracted_products_from_blocks": [
    {
      "source_url": "page_url",
      "products": [
        {
          "product_title": "Paco Rabanne One Million Lucky EDT 100ML",
          "product_price": "$59.00 (was $100.00) 41% OFF",
          "product_brand": "Paco Rabanne",
          "product_volume": "100ML",
          "product_type": "EDT",
          "product_features": ["Made in France", "Men's Fragrance", "Best Seller"]
        }
      ]
    }
  ],
  "extracted_products_from_details": [
    {
      "source_url": "detail_page_url",
      "product_title": "Paco Rabanne One Million Lucky Eau de Toilette 100ML",
      "product_price": "$59.00 (Original: $100.00) - Save 41%",
      "product_description": "Paco Rabanne One Million Lucky EDT 100ML...",
      "product_brand": "Paco Rabanne",
      "product_specifications": ["Brand: Paco Rabanne", "Size: 100ML", "Type: Eau de Toilette"],
      "product_images": ["image1.jpg", "image2.jpg"],
      "product_features": ["Made in France", "Long-lasting", "For Men"],
      "product_rating": "4.8/5 (6,911 reviews)",
      "product_availability": "In Stock"
    }
  ],
  "extraction_summary": {
    "total_products_from_blocks": 0,
    "total_products_from_details": 0,
    "success_rate": "100%"
  }
}
`;

  try {
    console.log('📡 Calling OpenRouter API...');
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        // "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3002",
        "X-Title": "Product Scraper"
      },
      body: JSON.stringify({
        // "model": "xiaomi/mimo-v2-flash",
        "messages": [{ 
          "role": "user", 
          "content": prompt 
        }],
        "temperature": 0.1,
        "max_tokens": 6000, // Increased for detail pages
        "response_format": { "type": "json_object" }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API response not OK:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // Debug log
    console.log('🔍 Raw AI response received');
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error('❌ Unexpected API response structure:', result);
      throw new Error('Invalid API response structure');
    }
    
    const aiResponse = result.choices[0].message.content;
    console.log('📝 AI response length:', aiResponse.length);
    
    // Try to extract JSON from response
    let extractedData;
    
    // Method 1: Try to parse directly
    try {
      extractedData = JSON.parse(aiResponse);
      console.log('✅ Successfully parsed JSON directly');
    } catch (parseError) {
      console.log('🔄 Could not parse directly, trying to extract JSON...');
      
      // Method 2: Try to extract JSON from markdown code blocks
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                       aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                       aiResponse.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          extractedData = JSON.parse(jsonMatch[1]);
          console.log('✅ Successfully extracted and parsed JSON');
        } catch (e2) {
          console.error('❌ Failed to parse extracted JSON:', e2.message);
          // Fallback: Create structured error response
          extractedData = {
            extracted_products_from_blocks: [],
            extracted_products_from_details: [],
            error: "Failed to parse AI response",
            raw_response_preview: aiResponse.substring(0, 200)
          };
        }
      } else {
        console.error('❌ No JSON found in response');
        extractedData = {
          extracted_products_from_blocks: [],
          extracted_products_from_details: [],
          error: "No JSON found in AI response",
          raw_response_preview: aiResponse.substring(0, 200)
        };
      }
    }
    
    // Validate the structure
    if (!extractedData.extracted_products_from_blocks && !extractedData.extracted_products_from_details) {
      console.log('⚠️ AI response missing expected fields, wrapping response');
      extractedData = {
        extracted_products_from_blocks: [],
        extracted_products_from_details: [],
        raw_ai_response: extractedData,
        note: "AI response was not in expected format"
      };
    }
    
    // Calculate summary statistics
    const productsFromBlocks = extractedData.extracted_products_from_blocks?.reduce(
      (sum, page) => sum + (page.products?.length || 0), 0
    ) || 0;
    
    const productsFromDetails = extractedData.extracted_products_from_details?.length || 0;
    
    console.log(`✅ AI extraction complete:`);
    console.log(`   📦 ${productsFromBlocks} products extracted from product blocks`);
    console.log(`   🔗 ${productsFromDetails} products extracted from detail pages`);
    console.log(`   📊 Total: ${productsFromBlocks + productsFromDetails} products`);
    
    // Add summary if not present
    if (!extractedData.extraction_summary) {
      extractedData.extraction_summary = {
        total_products_from_blocks: productsFromBlocks,
        total_products_from_details: productsFromDetails,
        total_products: productsFromBlocks + productsFromDetails,
        success_rate: "100%"
      };
    }
    
    return extractedData;
    
  } catch (error) {
    console.error('❌ AI extraction failed:', error.message);
    
    // Return a fallback response instead of throwing
    return {
      extracted_products_from_blocks: [],
      extracted_products_from_details: [],
      error: "AI extraction failed",
      error_details: error.message,
      note: "See raw scraped data for manual analysis"
    };
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
    
    // Step 3: Extract with AI (with try-catch to continue even if AI fails)
    // let extractedData;
    // let aiError = null;
    
    try {
      // extractedData = await extractDataWithAI(scrapedData);
      console.log(`🤖 AI extraction complete`);
    } catch (aiError) {
      console.error('⚠️ AI extraction failed, but continuing:', aiError.message);
      // extractedData = {
      //   extracted_products: [],
      //   error: "AI extraction failed",
      //   error_details: aiError.message
      // };
    }
    
    // Step 4: Save extracted data
    // const extractedFilePath = saveStoreInfoToJSON(`${domain}_extracted`, extractedData);
    
    // Step 5: Return results
    res.json({
      success: true,
      domain: domain,
      stats: {
        pages_scraped: scrapedData.pages_checked,
        product_pages_found: scrapedData.products_found,
        total_blocks: scrapedData.products.reduce((sum, p) => sum + p.productBlocks.length, 0)
      },
      // extracted_data: extractedData,
      detail_pages: scrapedData.detail_pages.slice(0, 10), // Return first 10 detail pages
      files: {
        raw_data: rawFilePath,
        extracted_data: extractedFilePath
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