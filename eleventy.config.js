module.exports = function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/vendor");

  // Tree children JSON (produced by Django export_frontend_data command)
  eleventyConfig.addPassthroughCopy({ "data/children": "data/children" });

  // Entity and place link shards (fetched on demand by detail pages and explorers, per D-08)
  eleventyConfig.addPassthroughCopy({ "data/entity-links": "data/entity-links" });
  eleventyConfig.addPassthroughCopy({ "data/place-links": "data/place-links" });

  // Explorer search index files (loaded once by explorer pages, per D-03)
  // entity index removed: entity pages now indexed via Pagefind (D-15)
  eleventyConfig.addPassthroughCopy({ "data/place-index.json": "data/place-index.json" });

  // Entity co-occurrence graph (loaded by network graph in Phase 9)
  eleventyConfig.addPassthroughCopy({ "data/entity-cooccurrence.json": "data/entity-cooccurrence.json" });

  // Watch for changes in CSS/JS during dev
  eleventyConfig.addWatchTarget("src/css/");
  eleventyConfig.addWatchTarget("src/js/");

  // Custom filters
  eleventyConfig.addFilter("limit", function(arr, limit) {
    return arr.slice(0, limit);
  });

  eleventyConfig.addFilter("splitPipe", function(str) {
    if (!str) return [str];
    return str.split("|").map(function(s) { return s.trim(); });
  });

  eleventyConfig.addFilter("safeSlug", function(str) {
    if (!str) return "";
    return str.replace(/[?#]/g, "");
  });

  eleventyConfig.addFilter("formatDate", function(dateStr) {
    if (!dateStr) return "";
    return dateStr;
  });

  eleventyConfig.addFilter("numberFormat", function(num) {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });

  eleventyConfig.addFilter("sortByOrder", function(arr, orderArray) {
    if (!arr || !orderArray) return arr;
    return orderArray
      .map(code => arr.find(item => item.code === code))
      .filter(item => item !== undefined);
  });

  eleventyConfig.addFilter("filterByRepo", function(arr, repoCode) {
    if (!arr || !repoCode) return [];
    return arr.filter(item => item.repository_code === repoCode);
  });

  eleventyConfig.addFilter("filterByLevel", function(arr, level) {
    if (!arr || !level) return [];
    return arr.filter(item => item.description_level === level);
  });

  // Filter to find description by reference_code
  eleventyConfig.addFilter("findByRef", function(arr, refCode) {
    if (!arr || !refCode) return null;
    return arr.find(item => item.reference_code === refCode);
  });

  // Get siblings (other children of same parent)
  eleventyConfig.addFilter("siblingsOf", function(arr, desc) {
    if (!arr || !desc) return [];
    return arr.filter(item =>
      item.parent_id === desc.parent_id &&
      item.id !== desc.id
    );
  });

  // Extract year from a date string ("YYYY-MM-DD" → "YYYY")
  eleventyConfig.addFilter("extractYear", function(dateStr) {
    if (!dateStr) return null;
    const year = String(dateStr).substring(0, 4);
    return /^\d{4}$/.test(year) ? year : null;
  });

  // Generate an array of integers from start year to end year, capped at 500 years
  // Used by entity Pagefind metadata to create one filter span per year in range (D-06)
  eleventyConfig.addFilter("yearRange", function(start, end) {
    if (!start) return [];
    const s = parseInt(start, 10);
    if (isNaN(s)) return [];
    const e = end ? parseInt(end, 10) : s;
    const cap = Math.min(e, s + 500);
    const years = [];
    for (let y = s; y <= cap; y++) years.push(y);
    return years;
  });

  // Truncate text with ellipsis
  eleventyConfig.addFilter("truncate", function(str, length) {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.substring(0, length) + "...";
  });

  // Build progress logging
  let pageCount = 0;
  const buildStart = Date.now();
  eleventyConfig.addTransform("progress", function(content) {
    pageCount++;
    if (pageCount % 5000 === 0) {
      const elapsed = ((Date.now() - buildStart) / 1000).toFixed(0);
      console.log(`[build] ${pageCount.toLocaleString()} pages generated (${elapsed}s)`);
    }
    return content;
  });

  eleventyConfig.on("eleventy.after", function() {
    const elapsed = ((Date.now() - buildStart) / 1000).toFixed(1);
    console.log(`[build] Complete: ${pageCount.toLocaleString()} pages in ${elapsed}s`);
  });

  // Shortcodes for common patterns
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
