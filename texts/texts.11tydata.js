module.exports = {
	eleventyComputed: {
		permalink: (data) => {
			if (typeof data.permalink !== "string") {
				return `text/${data.page.fileSlug}/index.html`;
			}

			const permalink = data.permalink.trim();

			if (!permalink) {
				return `text/${data.page.fileSlug}/index.html`;
			}

			if (permalink.endsWith("/") || permalink.endsWith(".html")) {
				return permalink;
			}

			return `${permalink}/index.html`;
		},
	},
};
