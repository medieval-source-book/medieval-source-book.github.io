module.exports = {
	eleventyComputed: {
		permalink: (data) => {
			if (typeof data.permalink !== "string") {
				return data.permalink;
			}

			if (data.permalink.endsWith("/") || data.permalink.endsWith(".html")) {
				return data.permalink;
			}

			return `${data.permalink}/index.html`;
		},
	},
};
