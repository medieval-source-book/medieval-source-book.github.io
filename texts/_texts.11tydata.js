module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      // If there's already a permalink and it doesn't end with / or .html, add /
      if (data.permalink && typeof data.permalink === 'string') {
        if (!data.permalink.endsWith('/') && !data.permalink.endsWith('.html')) {
          return data.permalink + '/';
        }
      }
      return data.permalink;
    }
  }
};
