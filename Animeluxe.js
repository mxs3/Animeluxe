
‏async function fetchAndSearch(keyword) {
‏    const url = `https://ww3.animeluxe.org/?s=${encodeURIComponent(keyword)}`;
‏    try {
‏        const response = await fetchv2(url, {
‏            headers: {
‏                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
‏        const html = await response.text();
‏        const results = searchResults(html);
‏        console.log("نتائج البحث:", results);
‏        return results;
‏    } catch (error) {
‏        console.error("خطأ في جلب البيانات:", error);
‏        return [];
    }
}

‏function searchResults(html) {
‏    const results = [];
‏    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">([\s\S]*?)<\/div>\s*<\/div>/g;
‏    const items = html.match(itemRegex) || [];
‏    items.forEach((itemHtml) => {
‏        const hrefMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="image lazyactive"/);
‏        const imgMatch = itemHtml.match(/data-src="([^"]+)"/);
‏        const titleMatch = itemHtml.match(/<h3>(.*?)<\/h3>/);
‏        const href = hrefMatch ? hrefMatch[1].trim() : '';
‏        const image = imgMatch ? imgMatch[1].trim() : '';
‏        const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';
‏        if (href && image && title) {
‏            results.push({ title, href, image });
        }
    });
‏    return results;
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();
        const details = [];

        const descriptionMatch = html.match(/<div class="summary-content">\s*<p>([\s\S]*?)<\/p>/s);
        const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : 'N/A';

        const airdateMatch = html.match(/<span>سنة الإصدار\s*:<\/span>\s*(\d{4})/);
        const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

        const genres = [];
        const genresMatch = html.match(/<div class="genres">([\s\S]*?)<\/div>/);
        if (genresMatch) {
            const genreRegex = /<a[^>]*>([^<]+)<\/a>/g;
            let genreMatch;
            while ((genreMatch = genreRegex.exec(genresMatch[1])) !== null) {
                genres.push(decodeHTMLEntities(genreMatch[1].trim()));
            }
        }

        details.push({
            description,
            aliases: genres.join(', '),
            airdate: `Aired: ${airdate}`
        });

        return JSON.stringify(details);
    } catch (error) {
        return JSON.stringify([{ description: 'Error', aliases: 'N/A', airdate: 'N/A' }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();
        const episodes = [];

        if (url.includes('movie')) {
            episodes.push({ number: 1, href: url });
        } else {
            const episodeRegex = /<a href="([^"]+)"[^>]*>الحلقة\s*(\d+)/g;
            let match;
            while ((match = episodeRegex.exec(html)) !== null) {
                episodes.push({
                    number: parseInt(match[2]),
                    href: match[1].trim() + '/watch/'
                });
            }
            if (episodes.length > 0 && episodes[0].number !== 1) {
                episodes.reverse();
            }
        }

        return JSON.stringify(episodes);
    } catch (error) {
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();
        const streams = [];

        const serverRegex = /<li[^>]+data-watch="([^"]+mp4upload\.com[^"]+)"/g;
        let match;
        while ((match = serverRegex.exec(html)) !== null) {
            const embedUrl = match[1].trim();
            const embedResponse = await soraFetch(embedUrl);
            const embedHtml = await embedResponse.text();

            const streamMatch = embedHtml.match(/player\.src\(\{\s*type:\s*["']video\/mp4["'],\s*src:\s*["']([^"']+)["']\s*\}\)/i);
            if (streamMatch) {
                streams.push({
                    title: 'mp4upload',
                    streamUrl: streamMatch[1].trim(),
                    headers: { Referer: 'https://mp4upload.com' }
                });
            }
        }

        return JSON.stringify({ streams, subtitles: null });
    } catch (error) {
        return JSON.stringify({ streams: [], subtitles: null });
    }
}
```​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​
