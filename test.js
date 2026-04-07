
// Helper function to clean HTML by removing unnecessary elements
import * as cheerio from "cheerio";
import fs from 'fs';
import path from 'path';
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

// Test the function
const testHtml = `<html>
   <head></head>
   <body>
      <div class=\"product__info-wrapper grid__item scroll-trigger animate--slide-in\">
         \n        
         <section id=\"ProductInfo-template--16865945780286__main\" class=\"product__info-container product__column-sticky\">
            <div style=\"display: flex; align-items: center; justify-content: space-between;\">\n                  
            <p class=\"product__text inline-richtext font-body-s \">Simond</p>
            <a class=\"rating-wrapper\" href=\"#pdpReviews\">
               \n                      \n                      <div class=\"rating\" role=\"img\" aria-label=\"4.6 out of 5 stars\">\n                        \n\n                        <span aria-hidden=\"true\" class=\"rating-star font-cap\" style=\"--rating: 4; --rating-max: 5; --rating-decimal: 0.5;\"></span>\n                        <span aria-hidden=\"true\" class=\"rating-star rating-star-all-stars font-cap\" style=\"--rating: 4; --rating-max: 5; --rating-decimal: 0.5;\"></span>\n\n                        
               <p class=\"rating-text font-cap\">\n                          <span aria-hidden=\"true\">4.6</span>\n                        </p>
               \n                        
               <p class=\"rating-count font-cap\">\n                          \n                          \n                          \n                            <span aria-hidden=\"true\">\n                              (2,310)</span>\n                          \n                          <span class=\"visually-hidden\">2310\n                            total reviews</span>\n                        </p>
               \n                      
      </div>
      \n                    </a></div><div class=\"product__title\">\n                  <h1 class=\"font-title-m\">Simond Men's MT100 Hooded Down Puffer Jacket</h1>\n                  <a href=\"/products/simond-mt100-hooded-down-puffer-jacket-167571\" class=\"product__title font-title-m\">\n                    <h2 class=\"h1\">\n                      Simond Men's MT100 Hooded Down Puffer Jacket\n                    </h2>\n                  </a>\n                </div>\n\n<div class=\"dkt-product-usp__container\">\n  <div class=\"dkt-product-usp__features\">\n    <div class=\"dkt-product-usp__tooltip\" id=\"tooltip\">\n      <button class=\"dkt-product-usp__tooltip-close\" id=\"closeTooltip\">✕</button>\n      <div class=\"dkt-product-usp__tooltip-header font-sub-m\">Free Returns</div>\n      <div class=\"dkt-product-usp__tooltip-text font-cap\">\n        We offer free returns for up to 30 Days, ensuring hassle-free exchanges and refunds.\n        <a href=\"#\" class=\"dkt-product-usp__tooltip-link\"></a>\n      </div>\n    </div>\n    \n    \n    <button class=\"dkt-product-usp__feature font-btn-s\" data-feature=\"shipping\"><svg width=\"21\" height=\"20\" viewBox=\"0 0 21 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M14.6667 16.6667C15.5871 16.6667 16.3333 15.9205 16.3333 15C16.3333 14.0795 15.5871 13.3333 14.6667 13.3333C13.7462 13.3333 13 14.0795 13 15C13 15.9205 13.7462 16.6667 14.6667 16.6667Z\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M6.33341 16.6667C7.25389 16.6667 8.00008 15.9205 8.00008 15C8.00008 14.0795 7.25389 13.3333 6.33341 13.3333C5.41294 13.3333 4.66675 14.0795 4.66675 15C4.66675 15.9205 5.41294 16.6667 6.33341 16.6667Z\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M4.66675 14.977L2.16836 15L2.18971 11.6667M8.00008 15H13.0001M2.16675 3.33334H12.1667V9.16668H18.8334V15H16.3334\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M2.16675 6.66666H7.16675\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M2.16675 9.16666H5.50008\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M12.1667 5L16.3334 5.00002L18.8334 9.16667\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n</svg>\n<span class=\"dkt-product-usp__feature-text\">Free Ship $49+</span>\n    </button>\n    \n\n    \n      <button class=\"dkt-product-usp__feature font-btn-s\" data-feature=\"returns\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M10.8333 8.33332L18.3333 4.99999L10.8333 1.66666L3.33325 4.99999L10.8333 8.33332Z\" stroke=\"white\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>\n<path d=\"M14.5833 3.33334L7.08325 6.66668\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M1.66675 10.8333H5.00008\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M1.66675 13.3333H5.00008\" stroke=\"white\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n<path d=\"M3.32904 5V8.75425M10.821 8.348V18.3333M1.66675 15.8362H5.2309L10.7903 18.315C10.8119 18.3246 10.8366 18.3246 10.8582 18.315L18.3334 14.995L18.3145 5.00619\" stroke=\"white\" stroke-width=\"1.5\"></path>\n</svg>\n<span class=\"dkt-product-usp__feature-text\">30-Day Returns</span>\n      </button>\n    \n  </div>\n</div>\n\n\n\n<div style=\"height: 1px; width: 100%; background-color: var(--color-gray-20)\"></div>\n<variant-selects id=\"variant-selects-template--16865945780286__main\" data-section=\"template--16865945780286__main\"><fieldset class=\"js product-form__input product-form__input--variant-image\">\n          <legend class=\"form__label\">\n            Color:\n            <span data-selected-value=\"\">Asphalt Blue</span>\n          </legend>\n          <div class=\"variant-image-grid\"><input type=\"radio\" id=\"template--16865945780286__main-1-0\" name=\"options[Color]\" value=\"Asphalt Blue\" form=\"product-form-template--16865945780286__main\" checked=\"\" class=\"variant-image-input\" data-option-value-id=\"2344181727294\" data-variant-id=\"41320423063614\" data-variant-image=\"//www.decathlon.com/cdn/shop/files/8858286-product_image-p2688048_dea6fdbb-43f3-4b78-8e1b-94ab328aec0e.jpg?v=1755033808&amp;width=100\">\n              <label for=\"template--16865945780286__main-1-0\" class=\"variant-image-label\" title=\"Asphalt Blue \"><img src=\"//www.decathlon.com/cdn/shop/files/8858286-product_image-p2688048_dea6fdbb-43f3-4b78-8e1b-94ab328aec0e.jpg?v=1755033808&amp;width=80\" srcset=\"\n                      //www.decathlon.com/cdn/shop/files/8858286-product_image-p2688048_dea6fdbb-43f3-4b78-8e1b-94ab328aec0e.jpg?v=1755033808&amp;width=80 80w,\n                      //www.decathlon.com/cdn/shop/files/8858286-product_image-p2688048_dea6fdbb-43f3-4b78-8e1b-94ab328aec0e.jpg?v=1755033808&amp;width=160 160w\n                    \" sizes=\"80px\" alt=\"Asphalt Blue - Simond Men's MT100 Hooded Down Puffer Jacket\" width=\"80\" height=\"80\" class=\"variant-image\"><span class=\"variant-image-name\">Asphalt Blue</span>\n              </label><input type=\"radio\" id=\"template--16865945780286__main-1-1\" name=\"options[Color]\" value=\"Olive Green\" form=\"product-form-template--16865945780286__main\" class=\"variant-image-input\" data-option-value-id=\"1454888255550\" data-variant-id=\"32494250295358\" data-variant-image=\"//www.decathlon.com/cdn/shop/files/8595408-product_image-p2549663.jpg?v=1755039849&amp;width=100\">\n              <label for=\"template--16865945780286__main-1-1\" class=\"variant-image-label\" title=\"Olive Green \"><img src=\"//www.decathlon.com/cdn/shop/files/8595408-product_image-p2549663.jpg?v=1755039849&amp;width=80\" srcset=\"\n                      //www.decathlon.com/cdn/shop/files/8595408-product_image-p2549663.jpg?v=1755039849&amp;width=80 80w,\n                      //www.decathlon.com/cdn/shop/files/8595408-product_image-p2549663.jpg?v=1755039849&amp;width=160 160w\n                    \" sizes=\"80px\" alt=\"Olive Green - Simond Men's MT100 Hooded Down Puffer Jacket\" width=\"80\" height=\"80\" class=\"variant-image\"><span class=\"variant-image-name\">Olive Green</span>\n              </label><input type=\"radio\" id=\"template--16865945780286__main-1-2\" name=\"options[Color]\" value=\"Dark Sepia\" form=\"product-form-template--16865945780286__main\" class=\"variant-image-input\" data-option-value-id=\"2875192705086\" data-variant-id=\"41912831344702\" data-variant-image=\"//www.decathlon.com/cdn/shop/files/8559957-product_image-p2688105.jpg?v=1755039960&amp;width=100\">\n              <label for=\"template--16865945780286__main-1-2\" class=\"variant-image-label\" title=\"Dark Sepia \"><img src=\"//www.decathlon.com/cdn/shop/files/8559957-product_image-p2688105.jpg?v=1755039960&amp;width=80\" srcset=\"\n                      //www.decathlon.com/cdn/shop/files/8559957-product_image-p2688105.jpg?v=1755039960&amp;width=80 80w,\n                      //www.decathlon.com/cdn/shop/files/8559957-product_image-p2688105.jpg?v=1755039960&amp;width=160 160w\n                    \" sizes=\"80px\" alt=\"Dark Sepia - Simond Men's MT100 Hooded Down Puffer Jacket\" width=\"80\" height=\"80\" class=\"variant-image\"><span class=\"variant-image-name\">Dark Sepia</span>\n              </label><input type=\"radio\" id=\"template--16865945780286__main-1-3\" name=\"options[Color]\" value=\"Smoked Black\" form=\"product-form-template--16865945780286__main\" class=\"variant-image-input\" data-option-value-id=\"2875192672318\" data-variant-id=\"41912831148094\" data-variant-image=\"//www.decathlon.com/cdn/shop/files/8858287-product_image-p2688083.jpg?v=1755033580&amp;width=100\">\n              <label for=\"template--16865945780286__main-1-3\" class=\"variant-image-label\" title=\"Smoked Black \"><img src=\"//www.decathlon.com/cdn/shop/files/8858287-product_image-p2688083.jpg?v=1755033580&amp;width=80\" srcset=\"\n                      //www.decathlon.com/cdn/shop/files/8858287-product_image-p2688083.jpg?v=1755033580&amp;width=80 80w,\n                      //www.decathlon.com/cdn/shop/files/8858287-product_image-p2688083.jpg?v=1755033580&amp;width=160 160w\n                    \" sizes=\"80px\" alt=\"Smoked Black - Simond Men's MT100 Hooded Down Puffer Jacket\" width=\"80\" height=\"80\" class=\"variant-image\"><span class=\"variant-image-name\">Smoked Black</span>\n              </label></div>\n        </fieldset><fieldset class=\"js product-form__input product-form__input--pill\"><div class=\"form__label-wrapper\">\n              <legend class=\"form__label\">Size</legend>\n              <div class=\"pdp-product-info__card size-guide-link font-btn-s\" data-drawer-id=\"pdp-product-info__category-4-drawer\" role=\"button\" tabindex=\"0\" aria-label=\"Open Size Guide details\" aria-expanded=\"false\" id=\"pdpSizeGuide\"><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" color=\"#3643ba\" fill=\"none\">\n    <path d=\"M5 9.97873C5 11.095 6.79086 12 9 12V9.97873C9 8.98454 9 8.48745 8.60252 8.18419C8.20504 7.88092 7.811 7.99435 7.02292 8.22121C5.81469 8.56902 5 9.2258 5 9.97873Z\" stroke=\"#3643ba\" stroke-width=\"1.5\" stroke-linejoin=\"round\"></path>\n    <path d=\"M16 8.5C16 10.433 12.866 12 9 12C5.13401 12 2 10.433 2 8.5C2 6.567 5.13401 5 9 5C12.866 5 16 6.567 16 8.5Z\" stroke=\"#3643ba\" stroke-width=\"1.5\"></path>\n    <path d=\"M2 9V15.6667C2 17.5076 5.13401 19 9 19H20C20.9428 19 21.4142 19 21.7071 18.7071C22 18.4142 22 17.9428 22 17V14C22 13.0572 22 12.5858 21.7071 12.2929C21.4142 12 20.9428 12 20 12H9\" stroke=\"#3643ba\" stroke-width=\"1.5\"></path>\n    <path d=\"M18 19V17M14 19V17M10 19V17M6 18.5V16.5\" stroke=\"#3643ba\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>\n</svg>Size Guide\n              </div>\n              \n\n              \n            </div>\n            \n\n<input type=\"radio\" id=\"template--16865945780286__main-2-0\" name=\"Size-2\n\" value=\"S\" form=\"product-form-template--16865945780286__main\" checked=\"\" data-product-url=\"\" data-option-value-id=\"32618872894\">\n    <label for=\"template--16865945780286__main-2-0\">\n      S<span class=\"visually-hidden label-unavailable\">Variant sold out or unavailable</span>\n    </label><input type=\"radio\" id=\"template--16865945780286__main-2-1\" name=\"Size-2\n\" value=\"M\" form=\"product-form-template--16865945780286__main\" data-product-url=\"\" data-option-value-id=\"32618905662\">\n    <label for=\"template--16865945780286__main-2-1\">\n      M<span class=\"visually-hidden label-unavailable\">Variant sold out or unavailable</span>\n    </label><input type=\"radio\" id=\"template--16865945780286__main-2-2\" name=\"Size-2\n\" value=\"L\" form=\"product-form-template--16865945780286__main\" data-product-url=\"\" data-option-value-id=\"32618938430\">\n    <label for=\"template--16865945780286__main-2-2\">\n      L<span class=\"visually-hidden label-unavailable\">Variant sold out or unavailable</span>\n    </label><input type=\"radio\" id=\"template--16865945780286__main-2-3\" name=\"Size-2\n\" value=\"XL\" form=\"product-form-template--16865945780286__main\" data-product-url=\"\" data-option-value-id=\"32618971198\">\n    <label for=\"template--16865945780286__main-2-3\">\n      XL<span class=\"visually-hidden label-unavailable\">Variant sold out or unavailable</span>\n    </label><input type=\"radio\" id=\"template--16865945780286__main-2-4\" name=\"Size-2\n\" value=\"2XL\" form=\"product-form-template--16865945780286__main\" data-product-url=\"\" data-option-value-id=\"32619003966\">\n    <label for=\"template--16865945780286__main-2-4\">\n      2XL<span class=\"visually-hidden label-unavailable\">Variant sold out or unavailable</span>\n    </label><input type=\"radio\" id=\"template--16865945780286__main-2-5\" name=\"Size-2\n\" value=\"3XL\" form=\"product-form-template--16865945780286__main\" data-product-url=\"\" data-option-value-id=\"32619036734\">\n    <label for=\"template--16865945780286__main-2-5\">\n      3XL<span class=\"visually-hidden label-unavailable\">Variant sold out or unavailable</span>\n    </label>\n        </fieldset>\n  </variant-selects>\n<div id=\"price-template--16865945780286__main\" role=\"status\">\n<div class=\"\n      price font-title-m price--show-badge\">\n    <div class=\"price__container\"><div class=\"price__regular\"><span class=\"visually-hidden visually-hidden--inline\">Regular price</span>\n          <span class=\"price-item price-item--regular\">\n            $119.00\n          </span></div>\n      <div class=\"price__sale\">\n        <span class=\"visually-hidden visually-hidden--inline\">Sale price</span>\n        <span class=\"price-item price-item--sale price-item--last\" style=\"background:var(--color-catchy); padding: 0 2px\">\n          $119.00\n        </span>\n          <span class=\"visually-hidden visually-hidden--inline\">Regular price</span>\n          <span class=\"font-cap\" style=\"color: var(--color-gray-60)\">Was\n            <span class=\"price-item price-item--regular\">\n              \n                \n              \n            </span>\n          </span></div>\n      <small class=\"unit-price caption hidden\">\n        <span class=\"visually-hidden\">Unit price</span>\n        <span class=\"price-item price-item--last\">\n          <span aria-hidden=\"true\">/</span>\n          <span class=\"visually-hidden\">&nbsp;per&nbsp;</span>\n          <span>\n            <span></span>\n          </span>\n        </span>\n      </small>\n    </div><span class=\"badge price__badge-sale color-scheme-4\">\n        Sale\n      </span>\n\n      \n\n      <span class=\"badge price__badge-sold-out color-scheme-3\">\n        Sold out\n      </span></div>\n\n</div><div class=\"product__tax caption rte\"></div><div><form method=\"post\" action=\"/cart/add\" id=\"product-form-installment-template--16865945780286__main\" accept-charset=\"UTF-8\" class=\"installment caption-large\" enctype=\"multipart/form-data\"><input type=\"hidden\" name=\"form_type\" value=\"product\"><input type=\"hidden\" name=\"utf8\" value=\"✓\"><input type=\"hidden\" name=\"id\" value=\"41320423063614\">\n                    \n<input type=\"hidden\" name=\"product-id\" value=\"4417342308414\"><input type=\"hidden\" name=\"section-id\" value=\"template--16865945780286__main\"></form></div>\n<div><product-form class=\"product-form\" data-hide-errors=\"false\" data-section-id=\"template--16865945780286__main\">\n      <form method=\"post\" action=\"/cart/add\" id=\"product-form-template--16865945780286__main\" accept-charset=\"UTF-8\" class=\"form\" enctype=\"multipart/form-data\" novalidate=\"novalidate\" data-type=\"add-to-cart-form\"><input type=\"hidden\" name=\"form_type\" value=\"product\"><input type=\"hidden\" name=\"utf8\" value=\"✓\"><input type=\"hidden\" name=\"id\" value=\"41320423063614\" class=\"product-variant-id\"><button id=\"BIS_trigger\" type=\"button\" class=\"button\" style=\"margin: 10px 0px; width: 100%; display: none;\">NOTIFY ME WHEN AVAILABLE</button><div class=\"product-form__buttons\"><button id=\"ProductSubmitButton-template--16865945780286__main\" type=\"submit\" name=\"add\" class=\"product-form__submit button--full-width btn btn--brand font-btn-m\" aria-haspopup=\"dialog\" data-original-text=\"\n            Add to cart\n\n\n\n  \n\n\n\">\n            <span>Add to cart\n</span>\n\n<div class=\"loading__spinner hidden\">\n  <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"spinner\" viewBox=\"0 0 66 66\"><circle stroke-width=\"6\" cx=\"33\" cy=\"33\" r=\"30\" fill=\"none\" class=\"path\"></circle></svg>\n\n</div>\n</button></div><input type=\"hidden\" name=\"product-id\" value=\"4417342308414\"><input type=\"hidden\" name=\"section-id\" value=\"template--16865945780286__main\"></form></product-form><link href=\"//www.decathlon.com/cdn/shop/t/334/assets/component-pickup-availability.css?v=34645222959864780961750076866\" rel=\"stylesheet\" type=\"text/css\" media=\"all\">\n<pickup-availability class=\"product__pickup-availabilities quick-add-hidden\" data-root-url=\"/\" data-variant-id=\"41320423063614\" data-has-only-default-variant=\"false\" data-product-page-color-scheme=\"gradient color-scheme-1\">\n      <template>\n        <pickup-availability-preview class=\"pickup-availability-preview\">\n          <span class=\"svg-wrapper\"><svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" class=\"icon icon-unavailable\" viewBox=\"0 0 20 20\"><path fill=\"#DE3618\" stroke=\"#fff\" d=\"M13.94 3.94 10 7.878l-3.94-3.94A1.499 1.499 0 1 0 3.94 6.06L7.88 10l-3.94 3.94a1.499 1.499 0 1 0 2.12 2.12L10 12.12l3.94 3.94a1.497 1.497 0 0 0 2.12 0 1.5 1.5 0 0 0 0-2.12L12.122 10l3.94-3.94a1.499 1.499 0 1 0-2.121-2.12z\"></path></svg>\n</span>\n          <div class=\"pickup-availability-info\">\n            <p class=\"caption-large\">Couldn't load pickup availability</p>\n            <button class=\"pickup-availability-button link link--text underlined-link\">\n              Refresh\n            </button>\n          </div>\n        </pickup-availability-preview>\n      </template>\n    </pickup-availability>\n\n    </div>\n<div style=\"height: 1px; width: 100%; background-color: var(--color-gray-20)\"></div><h6 class=\"font-overline\" style=\"color: var(--color-gray-60); margin: 0\">ABOUT THIS ITEM</h6>\n                  <div class=\"product__description rte quick-add-hidden font-body-s\" style=\"color: var(--color-black)\">\n                    Stay protected from the elements with this hooded, padded jacket. Responsibly sourced, it’s also the most compressible of our down jackets. Choose from a range of colors.\n                  </div><div data-dy-embedded-object=\"true\"><div class=\"dy_unit dy_smart_object_3051747 dy-auto-embedder dyother dyMonitor\" data-adid=\"smart_object_3051747||1027|||\" data-dy-exp-id=\"2201712\" data-dy-var-id=\"30093962\" data-dy-ver-data=\"14874105::0:1775472300269:92420:95906:2:3:0.21998094185255468:0.0035193946678191423\" data-dy-att-method=\"0\" data-dy-att-seq=\"95906\"><div class=\"product__description rte quick-add-hidden font-body-s\" style=\"color: var(--color-black)\">\n    <strong style=\"color: var(--color-error)\">Brand update:</strong> Forclaz is becoming Simond. You may receive a product labeled with either name. It is the same design and quality with a new brand label. <strong><a href=\"https://www.decathlon.com/blogs/news/forclaz-becomes-simond\" target=\"_blank\">Learn more</a></strong>\n</div></div></div><div id=\"pdpModelCode\" class=\"font-btn-s\" style=\" color: var(--color-gray-60)\">ID 8858286</div>\n<a href=\"/products/simond-mt100-hooded-down-puffer-jacket-167571\" class=\"link product__view-details animate-arrow\">\n            View full details\n<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" class=\"icon icon-arrow\" viewBox=\"0 0 14 10\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M8.537.808a.5.5 0 0 1 .817-.162l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 1 1-.708-.708L11.793 5.5H1a.5.5 0 0 1 0-1h10.793L8.646 1.354a.5.5 0 0 1-.109-.546\" clip-rule=\"evenodd\"></path></svg>\n</a>\n        </section>\n      </div>
   </body>
</html>
`;

console.log('=== TESTING CLEANHTML FUNCTION ===');
const output=cleanHTML(testHtml);
  fs.writeFileSync('test_output.html', output, 'utf-8');
