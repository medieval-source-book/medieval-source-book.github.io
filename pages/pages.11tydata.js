module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      // If there's a permalink in front matter
      if (data.permalink) {
        const permalink = data.permalink;
        // If permalink doesn't end with .html or /, convert to /index.html structure
        if (!permalink.endsWith('.html') && !permalink.endsWith('/')) {
          return `${permalink}/index.html`;
        }
        return permalink;
      }
      // Otherwise return undefined to use default permalink
      return undefined;
    }
  }
};
