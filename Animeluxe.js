async function fetchAndSearch(keyword) {
    const url = `https://ww3.animeluxe.org/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetchv2(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const html = await response.text();
        const results = searchResults(html);
        return results;
    } catch (error) {
        return [];
    }
}

function searchResults(html) {
    const results = [];
    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">([\s\S]*?)<\/div>\s*<\/div>/g;
    const items = html.match(itemRegex) || [];
    items.forEach((itemHtml) => {
        const hrefMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="image lazyactive"/);
        const imgMatch = itemHtml.match(/data-src="([^"]+)"/);
        const titleMatch = itemHtml.match(/<h3>(.*?)<\/h3>/);
        const href = hrefMatch ? hrefMatch[1].trim() : '';
        const image = imgMatch ? imgMatch[1].trim() : '';
        const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';
        if (href && image && title) {
            results.push({ title, href, image });
        }
    });
    return results;
}

async function extractDetails(url) {
    const results = [];
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://ww3.animeluxe.org/'
    };

    try {
        const response = await fetchv2(url, headers);
        const html = await response.text();

        const descriptionMatch = html.match(/<div class="content">\s*<p>(.*?)<\/p>/s);
        const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : 'N/A';

        const airdateMatch = html.match(/سنة العرض\s*:\s*<span>(\d{4})<\/span>/);
        const airdate = airdateMatch ? airdateMatch[1] : 'N/A';

        const genreMatches = html.match(/<div class="genres">([\s\S]*?)<\/div>/);
        const genres = [];
        if (genreMatches) {
            const genreTags = [...genreMatches[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)];
            for (const tag of genreTags) {
                genres.push(decodeHTMLEntities(tag[1].trim()));
            }
        }

        results.push({
            description,
            airdate,
            aliases: genres.length ? genres.join(', ') : 'N/A'
        });

        return JSON.stringify(results);
    } catch (error) {
        return JSON.stringify([{
            description: 'N/A',
            airdate: 'N/A',
            aliases: 'N/A'
        }]);
    }
}

function extractEpisodes(html) {
    const episodes = [];

    const episodeRegex = /<div class="episodes-card">([\s\S]*?)<\/div>\s*<\/div>/g;
    const items = html.match(episodeRegex) || [];

    if (items.length === 0) {
        const fallbackRegex = /<div class="col-[^"]+">\s*<div class="episodes-card">([\s\S]*?)<\/div>\s*<\/div>/g;
        const fallbackItems = html.match(fallbackRegex) || [];

        for (const item of fallbackItems) {
            const urlMatch = item.match(/<a href="([^"]+)"/);
            const numberMatch = item.match(/<div class="episode-number">([^<]+)<\/div>/);

            if (urlMatch && numberMatch) {
                let url = urlMatch[1].trim();
                url = encodeURI(url);

                episodes.push({
                    title: numberMatch[1].trim(),
                    url: url
                });
            }
        }

        return episodes;
    }

    for (const item of items) {
        const urlMatch = item.match(/<a href="([^"]+)"/);
        const numberMatch = item.match(/<div class="episode-number">([^<]+)<\/div>/);

        if (urlMatch && numberMatch) {
            let url = urlMatch[1].trim();
            url = encodeURI(url);

            episodes.push({
                title: numberMatch[1].trim(),
                url: url
            });
        }
    }

    return episodes;
}

function extractStreamLinks(html) {
    const sources = [];

    const iframeRegex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/g;
    let match;

    while ((match = iframeRegex.exec(html)) !== null) {
        const src = match[1];
        if (src.includes("uqload") || src.includes("mp4upload") || src.includes("vidmoly") || src.includes("vk.com")) {
            sources.push(src);
        }
    }

    return sources;
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}
