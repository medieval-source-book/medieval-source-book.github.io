const siteURL = "https://sourcebook.stanford.edu"; // don't include trailing slash as the arguments passed to absoluteUrl function start with a slash
const { DateTime } = require("luxon");
const MarkdownIt = require("markdown-it");
const yaml = require("js-yaml");
const md = new MarkdownIt({ 
  html: true, 
  linkify: true, 
  typographer: true,
  breaks: false
});
const fs = require("fs");
const path = require("path");

function normalizeUrlPath(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function toRedirectOutputPath(urlPath) {
  if (!urlPath) {
    return null;
  }

  if (urlPath.endsWith(".html")) {
    return urlPath;
  }

  if (urlPath.endsWith("/")) {
    return `${urlPath}index.html`;
  }

  return `${urlPath}/index.html`;
}

function readFrontMatterData(filePath) {
  let contents;

  try {
    contents = fs.readFileSync(filePath, "utf8");
  } catch {
    return {};
  }

  const frontMatterMatch = contents.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!frontMatterMatch) {
    return {};
  }

  try {
    const parsed = yaml.load(frontMatterMatch[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readCsvRedirectRows(filePath) {
  let contents;

  try {
    contents = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const lines = contents.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].toLowerCase();
  if (header !== "url,redirect") {
    return [];
  }

  const rows = [];

  for (const line of lines.slice(1)) {
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) {
      continue;
    }

    rows.push({
      url: line.slice(0, commaIndex).trim(),
      redirect: line.slice(commaIndex + 1).trim(),
    });
  }

  return rows;
}

module.exports = function(eleventyConfig) {
  // Enable YAML global data files (e.g., 11ty/_data/*.yml)
  eleventyConfig.addDataExtension("yml", contents => yaml.load(contents));
  eleventyConfig.addDataExtension("yaml", contents => yaml.load(contents));
  // Passthroughs for original repo assets and html
  // Copy entire assets folder plus explicit subfolders to be safe in environments
  // where directory-level passthroughs can be flaky.
  eleventyConfig.addPassthroughCopy({"assets": "assets"});
  eleventyConfig.addPassthroughCopy("assets/css");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/img");
  eleventyConfig.addPassthroughCopy("assets/fonts");
  eleventyConfig.addPassthroughCopy({"html": "legacy_html"});
  eleventyConfig.addPassthroughCopy({"11ty/dist/css": "css"});

  // Safeguard: ensure critical asset folders are present in output even if
  // passthrough copy is skipped by environment quirks.
  eleventyConfig.on("afterBuild", () => {
    const projectRoot = __dirname;
    const outDir = path.join(__dirname, "_site_11ty");
    const ensureCopy = (srcRel, destRel) => {
      const src = path.join(projectRoot, srcRel);
      const dest = path.join(outDir, destRel);
      try {
        if (fs.existsSync(src)) {
          fs.mkdirSync(dest, { recursive: true });
          // Node 16+: cpSync available
          if (fs.cpSync) {
            fs.cpSync(src, dest, { recursive: true });
          } else {
            // Fallback: shallow copy files in directory
            const entries = fs.readdirSync(src);
            for (const e of entries) {
              const s = path.join(src, e);
              const d = path.join(dest, e);
              const stat = fs.statSync(s);
              if (stat.isDirectory()) fs.mkdirSync(d, { recursive: true });
              else fs.copyFileSync(s, d);
            }
          }
        }
      } catch (err) {
        console.warn("[11ty] afterBuild copy failed for", srcRel, err && err.message);
      }
    };
    ensureCopy("assets/css", "assets/css");
    ensureCopy("assets/js", "assets/js");
    ensureCopy("assets/img", "assets/img");
    ensureCopy("assets/fonts", "assets/fonts");
  });

  // Ignore secondary/duplicate source folders that contain the same
  // content (these cause DuplicatePermalinkOutputError when Eleventy
  // encounters identical `permalink` front-matter across files).
  // We prefer the canonical `_texts` and `_genres/_periods/_languages`
  // directories and will ignore the YAML shim folder and the
  // `_texts original` backups.
  eleventyConfig.ignores.add("_yaml/**");
  eleventyConfig.ignores.add("_texts original/**");
  eleventyConfig.ignores.add("html/**");
  eleventyConfig.ignores.add("jekyll-site/**");
  eleventyConfig.ignores.add("edits_needed/**");

  // Filters
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat("yyyy-LL-dd");
  });
  // No-op `safe` filter to support templates migrated from Jekyll/Nunjucks
  // that use `| safe`. Liquid in Eleventy doesn't auto-escape by default,
  // but adding this avoids "undefined filter: safe" errors.
  eleventyConfig.addFilter("safe", function(value) {
    return value;
  });

  // Provide Jekyll-like filters used in templates
  eleventyConfig.addFilter("markdownify", function(str) {
    if (!str) return str;
    return md.render(String(str));
  });
  eleventyConfig.addFilter("relative_url", function(url) {
    if(!url) return url;
    return url.replace(/\s+/, "");
  });
  eleventyConfig.addFilter("absolute_url", function(url) {
    if(!url) return url;
    // Use site.url from data if available; fallback to empty
    const site = (this && this.ctx && this.ctx.site) ? this.ctx.site : {};
    return (site.url || "") + (url || "");
  });

  // Set the Markdown library to use the custom MarkdownIt instance
  eleventyConfig.setLibrary("md", md);

  // Collections mapped to Jekyll-style folders in repo root  
  eleventyConfig.addCollection("texts", function(collectionApi) {
    return collectionApi.getFilteredByGlob(["texts/**/*.md", "texts/**/*.html"]);
  });
  eleventyConfig.addCollection("textRedirects", function(collectionApi) {
    const redirectPages = [];
    const usedPermalinks = new Set();
    const usedRedirects = new Set();

    for (const item of collectionApi.getFilteredByGlob(["texts/**/*.md", "texts/**/*.html"])) {
      const targetUrl = normalizeUrlPath(item.url || item.data.permalink);
      if (!targetUrl) {
        continue;
      }

      usedPermalinks.add(targetUrl);
      usedPermalinks.add(toRedirectOutputPath(targetUrl));
    }

    for (const item of collectionApi.getFilteredByGlob(["texts/**/*.md", "texts/**/*.html"])) {
      const redirects = Array.isArray(item.data.redirect_from)
        ? item.data.redirect_from
        : [item.data.redirect_from];
      const targetUrl = normalizeUrlPath(item.url || item.data.permalink);

      if (!targetUrl) {
        continue;
      }

      for (const redirectValue of redirects) {
        const redirectFrom = normalizeUrlPath(redirectValue);
        const redirectOutputPath = toRedirectOutputPath(redirectFrom);
        const redirectPathParts = redirectFrom ? redirectFrom.split("/").filter(Boolean) : [];

        if (!redirectFrom || !redirectOutputPath) {
          continue;
        }

        if (redirectPathParts.length < 2) {
          continue;
        }

        if (
          redirectFrom === targetUrl ||
          redirectOutputPath === toRedirectOutputPath(targetUrl) ||
          usedPermalinks.has(redirectFrom) ||
          usedPermalinks.has(redirectOutputPath) ||
          usedRedirects.has(redirectOutputPath)
        ) {
          continue;
        }

        usedRedirects.add(redirectOutputPath);
        redirectPages.push({
          permalink: redirectOutputPath,
          target: targetUrl,
          source: item.inputPath,
        });
      }
    }

    return redirectPages;
  });
  eleventyConfig.addCollection("editsNeededRedirects", function(collectionApi) {
    const redirectPages = [];
    const usedPermalinks = new Set();
    const usedRedirects = new Set();
    const targetUrl = "/text-under-development/";

    for (const item of collectionApi.getFilteredByGlob(["texts/**/*.md", "texts/**/*.html"])) {
      const existingUrl = normalizeUrlPath(item.url || item.data.permalink);
      if (!existingUrl) {
        continue;
      }

      usedPermalinks.add(existingUrl);
      usedPermalinks.add(toRedirectOutputPath(existingUrl));

      const existingRedirects = Array.isArray(item.data.redirect_from)
        ? item.data.redirect_from
        : [item.data.redirect_from];

      for (const redirectValue of existingRedirects) {
        const redirectFrom = normalizeUrlPath(redirectValue);
        const redirectOutputPath = toRedirectOutputPath(redirectFrom);

        if (!redirectFrom || !redirectOutputPath) {
          continue;
        }

        usedPermalinks.add(redirectFrom);
        usedPermalinks.add(redirectOutputPath);
      }
    }

    usedPermalinks.add(targetUrl);
    usedPermalinks.add(toRedirectOutputPath(targetUrl));

    const editsNeededDir = path.join(__dirname, "edits_needed");
    let files = [];

    try {
      files = fs
        .readdirSync(editsNeededDir)
        .filter((entry) => entry.toLowerCase().endsWith(".md"));
    } catch {
      return redirectPages;
    }

    for (const filename of files) {
      const inputPath = path.join(editsNeededDir, filename);
      const data = readFrontMatterData(inputPath);
      const redirectValues = [];

      if (Array.isArray(data.redirect_from)) {
        redirectValues.push(...data.redirect_from);
      } else {
        redirectValues.push(data.redirect_from);
      }

      redirectValues.push(data.permalink);

      for (const value of redirectValues) {
        const redirectFrom = normalizeUrlPath(value);
        const redirectOutputPath = toRedirectOutputPath(redirectFrom);

        if (!redirectFrom || !redirectOutputPath) {
          continue;
        }

        if (
          redirectFrom === targetUrl ||
          redirectOutputPath === toRedirectOutputPath(targetUrl) ||
          usedPermalinks.has(redirectFrom) ||
          usedPermalinks.has(redirectOutputPath) ||
          usedRedirects.has(redirectOutputPath)
        ) {
          continue;
        }

        usedRedirects.add(redirectOutputPath);
        redirectPages.push({
          permalink: redirectOutputPath,
          target: targetUrl,
          source: inputPath,
        });
      }
    }

    return redirectPages;
  });
  eleventyConfig.addCollection("csvRedirects", function(collectionApi) {
    const redirectPages = [];
    const usedPermalinks = new Set();
    const usedRedirects = new Set();

    for (const item of collectionApi.getFilteredByGlob(["texts/**/*.md", "texts/**/*.html"])) {
      const existingUrl = normalizeUrlPath(item.url || item.data.permalink);
      if (!existingUrl) {
        continue;
      }

      usedPermalinks.add(existingUrl);
      usedPermalinks.add(toRedirectOutputPath(existingUrl));

      const existingRedirects = Array.isArray(item.data.redirect_from)
        ? item.data.redirect_from
        : [item.data.redirect_from];

      for (const redirectValue of existingRedirects) {
        const redirectFrom = normalizeUrlPath(redirectValue);
        const redirectOutputPath = toRedirectOutputPath(redirectFrom);

        if (!redirectFrom || !redirectOutputPath) {
          continue;
        }

        usedPermalinks.add(redirectFrom);
        usedPermalinks.add(redirectOutputPath);
      }
    }

    const editsNeededDir = path.join(__dirname, "edits_needed");
    let editsNeededFiles = [];

    try {
      editsNeededFiles = fs
        .readdirSync(editsNeededDir)
        .filter((entry) => entry.toLowerCase().endsWith(".md"));
    } catch {
      editsNeededFiles = [];
    }

    for (const filename of editsNeededFiles) {
      const inputPath = path.join(editsNeededDir, filename);
      const data = readFrontMatterData(inputPath);
      const redirectValues = [];

      if (Array.isArray(data.redirect_from)) {
        redirectValues.push(...data.redirect_from);
      } else {
        redirectValues.push(data.redirect_from);
      }

      redirectValues.push(data.permalink);

      for (const value of redirectValues) {
        const redirectFrom = normalizeUrlPath(value);
        const redirectOutputPath = toRedirectOutputPath(redirectFrom);

        if (!redirectFrom || !redirectOutputPath) {
          continue;
        }

        usedPermalinks.add(redirectFrom);
        usedPermalinks.add(redirectOutputPath);
      }
    }

    const csvPath = path.join(__dirname, "_data", "redirects.csv");
    for (const row of readCsvRedirectRows(csvPath)) {
      const redirectFrom = normalizeUrlPath(row.url);
      const targetUrl = normalizeUrlPath(row.redirect);
      const redirectOutputPath = toRedirectOutputPath(redirectFrom);

      if (!redirectFrom || !targetUrl || !redirectOutputPath) {
        continue;
      }

      if (
        redirectFrom === targetUrl ||
        redirectOutputPath === toRedirectOutputPath(targetUrl) ||
        usedPermalinks.has(redirectFrom) ||
        usedPermalinks.has(redirectOutputPath) ||
        usedRedirects.has(redirectOutputPath)
      ) {
        continue;
      }

      usedRedirects.add(redirectOutputPath);
      redirectPages.push({
        permalink: redirectOutputPath,
        target: targetUrl,
        source: csvPath,
      });
    }

    return redirectPages;
  });
  eleventyConfig.addCollection("textcollections", function(collectionApi) {
    return collectionApi.getFilteredByGlob(["textcollections/**/*.md", "textcollections/**/*.html"]);
  });
  eleventyConfig.addCollection("languages", function(collectionApi) {
    return collectionApi.getFilteredByGlob(["languages/**/*.md"]);
  });
  eleventyConfig.addCollection("periods", function(collectionApi) {
    return collectionApi.getFilteredByGlob(["periods/**/*.md"]);
  });
  eleventyConfig.addCollection("genres", function(collectionApi) {
    return collectionApi.getFilteredByGlob(["genres/**/*.md"]);
  });

  // Map Jekyll layout names to layout files in 11ty/_layouts
  eleventyConfig.addLayoutAlias("periodpage", "periodpage.html");
  eleventyConfig.addLayoutAlias("languagepage", "languagepage.html");
  eleventyConfig.addLayoutAlias("regionpage", "languagepage.html");
  eleventyConfig.addLayoutAlias("genrepage", "genrepage.html");
  eleventyConfig.addLayoutAlias("page", "page.html");
  eleventyConfig.addLayoutAlias("text", "text.html");
  eleventyConfig.addLayoutAlias("frontpage", "frontpage.html");
  eleventyConfig.addLayoutAlias("collection", "collection.html");
  eleventyConfig.addLayoutAlias("project", "project.html");
  // Jekyll uses a `compress` layout for HTML compression in some templates; alias it
  eleventyConfig.addLayoutAlias("compress", "default.html");

  return {
    dir: {
      input: ".",              // current directory for content files
      includes: "_includes",
      layouts: "layouts",
      data: "_data",
      output: "dist"
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    templateFormats: ["md","njk","html","yml","liquid"]
  };
};
