const axios = require('axios');
const cheerio = require('cheerio');
const { parseStringPromise } = require('xml2js');

class ImageExtractionService {
    async getArticleUrlFromRSS(rssUrl) {
        const { data } = await axios.get(rssUrl);
        const parsed = await parseStringPromise(data);
        const item = parsed.rss?.channel?.[0]?.item?.[0];
        return item?.link?.[0];
    }

    async getRelevantImageFromArticle(url) {
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0', // Helps avoid being blocked
            },
        });
        const $ = cheerio.load(html);

        // Try Open Graph
        let image = $('meta[property="og:image"]').attr('content');
        if (!image) {
            // Try Twitter image
            image = $('meta[name="twitter:image"]').attr('content');
        }
        if (!image) {
            // Fallback to first image in the article
            image = $('img').first().attr('src');
        }
        return image || null;
    }

    async extractImageFromRSS(rssUrl) {
        try {
            const imageUrl = await this.getRelevantImageFromArticle(articleUrl);
            return imageUrl;
        } catch (error) {
            console.error('Error extracting image:', error.message);
            throw error;
        }
    }

    async extractImageFromArticle(articleUrl) {
        try {
            const imageUrl = await this.getRelevantImageFromArticle(articleUrl);
            return {
                articleUrl,
                imageUrl
            };
        } catch (error) {
            console.error('Error extracting image:', error.message);
            throw error;
        }
    }
}

module.exports = new ImageExtractionService(); 

