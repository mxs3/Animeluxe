function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = { '"': '"', '&': '&', "'": "'", '<': '<', '>': '>' };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetch(url, options);
    } catch (error) {
        return null;
    }
}

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const searchUrl = `https://ww3.animeluxe.org/anime?s=${encodedKeyword}`;
        const response = await soraFetch(searchUrl);
        const html = await response.text();
        const results = [];

        const itemRegex = /<div class="anime-post"[\s\S]*?<a href="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?data-src="([^"]+)"/g;
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
            results.push({
                title: decodeHTMLEntities(match[2].trim()),
                href: match[1].trim(),
                image: match[3].trim()
            });
        }

        return JSON.stringify(results);
    } catch (error) {
        return JSON.stringify([{ title: 'Error', href: '', image: '' }]);
    }
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
