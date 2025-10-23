module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      // If there's already a permalink and it doesn't end with / or .html, add .html
      if (data.permalink && typeof data.permalink === 'string') {
        let permalink = data.permalink;
        // Ensure it starts with /
        if (!permalink.startsWith('/')) {
          permalink = '/' + permalink;
        }
        // Add .html if it doesn't end with / or .html
        if (!permalink.endsWith('/') && !permalink.endsWith('.html')) {
          permalink = permalink + '.html';
        }
        return permalink;
      }
      return data.permalink;
    }
  }
};
