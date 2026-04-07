import mongoose from 'mongoose';

const productBlockSchema = new mongoose.Schema({
  html: { type: String },
  page_url: { type: String },
  detail_link: { type: String, default: null },
  fingerprint: { type: String }
}, { _id: false });

const pageStatsSchema = new mongoose.Schema({
  blocks: { type: Number, default: 0 },
  detail_links_found: { type: Number, default: 0 },
  new_detail_links: { type: Number, default: 0 },
  duplicate_detail_links: { type: Number, default: 0 }
}, { _id: false });

const productPageSchema = new mongoose.Schema({
  url: { type: String },
  productBlocks: [productBlockSchema],
  page_type: { type: String },
  stats: pageStatsSchema
}, { _id: false });

const detailPageSchema = new mongoose.Schema({
  url: { type: String },
  product_html: { type: String },
  timestamp: { type: String }
}, { _id: false });

const extractedProductSchema = new mongoose.Schema({
  source_url: { type: String },
  product_title: { type: String },
  product_price: { type: String },
  product_brand: { type: String },
  product_category: { type: String },
  product_description: { type: String },
  product_features: [String],
  product_specifications: [String],
  product_images: [String],
  product_rating: { type: String },
  product_availability: { type: String }
}, { _id: false });

const scrapedStoreSchema = new mongoose.Schema({
  domain: { type: String, required: true, index: true },
  scraped_at: { type: Date, default: Date.now },
  
  // Raw scrape results
  pages_checked: { type: Number, default: 0 },
  products_found: { type: Number, default: 0 },
  detail_pages_scraped: { type: Number, default: 0 },
  
  // Tracking stats
  tracking: {
    total_links_found: Number,
    links_crawled: Number,
    valid_links: Number,
    skipped_links: Number,
    error_links: Number,
    product_pages: Number,
    non_product_pages: Number,
    product_blocks_total: Number,
    detail_links_found: Number,
    duplicate_detail_links: Number,
    unique_detail_links: Number,
    deduplication_rate: Number,
    detail_pages_success: Number,
    detail_pages_failed: Number,
    detail_pages_success_rate: Number
  },
  
  // Product pages with blocks
  products: [productPageSchema],
  
  // Detail pages HTML
  detail_pages: [detailPageSchema],
  
  // AI extracted data
  extracted_data: {
    extracted_products_from_blocks: { type: mongoose.Schema.Types.Mixed },
    extracted_products_from_details: [extractedProductSchema],
    extraction_summary: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    error_details: { type: String }
  }
});

const ScrapedStore = mongoose.model('ScrapedStore', scrapedStoreSchema);

export default ScrapedStore;
