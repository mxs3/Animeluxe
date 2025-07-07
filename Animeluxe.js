function fetchAndSearch(keyword) {
    const url = `https://ww3.animeluxe.org/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(url, {
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

function extractDetails(html) {
    const details = [];
    const descriptionMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>/s);
    const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : "";
    const airdateMatch = html.match(/سنة بداية العرض\s*<\/small>\s*<small[^>]*>\s*(\d{4})\s*<\/small>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : "";
    const genres = [];
    const genreMatches = html.match(/<a[^>]*class="subtitle[^"]*"[^>]*>(.*?)<\/a>/g);
    if (genreMatches) {
        genreMatches.forEach((genre) => {
            const genreText = genre.match(/>([^<]+)<\/a>/);
            if (genreText) genres.push(genreText[1].trim());
        });
    }
    const altMatch = html.match(/اسماء اخرى[^<]*<\/strong>\s*([^<]+)/);
    const altNames = altMatch ? decodeHTMLEntities(altMatch[1].trim()) : "";
    if (description || airdate || genres.length || altNames) {
        details.push({
            description,
            airdate,
            aliases: altNames || genres.join(", ")
        });
    }
    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a[^>]+href="([^"]+\/episode\/[^"]+)"[^>]*>\s*(?:<span[^>]*>)?الحلقة\s*(\d+)(?:[^<]*)<\/a>/gi;
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const number = match[2].trim();
        episodes.push({ href, number });
    }
    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return episodes;
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
