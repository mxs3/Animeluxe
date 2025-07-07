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

async function fetchv2(url, headers) {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Network response was not ok');
    return response;
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

async function extractDetails(html) {
    const results = [];

    const descriptionMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>/s);
    const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : 'N/A';

    const ratingMatch = html.match(/التصنيف\s*:\s*<\/strong>\s*([^<]+)<\/span>/);
    const rating = ratingMatch ? decodeHTMLEntities(ratingMatch[1].trim()) : 'N/A';

    const airdateMatch = html.match(/سنة العرض\s*:\s*<\/strong>\s*(\d{4})<\/span>/);
    const airdate = airdateMatch ? airdateMatch[1] : 'N/A';

    results.push({
        description,
        airdate,
        rating
    });

    return JSON.stringify(results);
}

function extractEpisodes(html) {
    const episodes = [];
    const itemRegex = /<a[^>]+href="([^"]+)"[^>]*>\s*(?:<div[^>]*>)?([^<]+)<\/(?:div|a)>/g;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
        const url = encodeURI(match[1].trim());
        const title = match[2].trim();
        episodes.push({ title, url });
    }
    return episodes;
}

function extractStreamLinks(html) {
    const sources = [];
    const iframeRegex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/g;
    let match;
    while ((match = iframeRegex.exec(html)) !== null) {
        const src = match[1];
        if (/(uqload|mp4upload|vidmoly|vk\.com)/.test(src)) {
            sources.push(src);
        }
    }
    return sources;
}

async function fetchDetails(url) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://ww3.animeluxe.org/'
    };

    const res = await fetchv2(url, headers);
    const html = await res.text();

    const details = await extractDetails(html);
    const episodes = extractEpisodes(html);

    const episodesWithLinks = [];
    for (const ep of episodes) {
        try {
            const epRes = await fetchv2(ep.url, headers);
            const epHtml = await epRes.text();
            const streams = extractStreamLinks(epHtml);
            episodesWithLinks.push({ title: ep.title, url: ep.url, streams });
        } catch {
            episodesWithLinks.push({ title: ep.title, url: ep.url, streams: [] });
        }
    }

    return { details: JSON.parse(details), episodes: episodesWithLinks };
}
