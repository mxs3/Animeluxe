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

function extractDetails(html) {
    const details = {};
    const descMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>/s);
    details.description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "";
    const yearMatch = html.match(/سنة بداية العرض\s*<\/small>\s*<small[^>]*>\s*(\d{4})\s*<\/small>/);
    details.year = yearMatch ? yearMatch[1].trim() : "";
    details.genres = [];
    const genreMatches = html.matchAll(/<a[^>]*class="subtitle[^"]*"[^>]*>(.*?)<\/a>/g);
    for (const match of genreMatches) {
        details.genres.push(match[1].trim());
    }
    const altMatch = html.match(/اسماء اخرى[^<]*<\/strong>\s*([^<]+)/);
    details.altNames = altMatch ? decodeHTMLEntities(altMatch[1].trim()) : "";
    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodePattern = /<a[^>]+href="([^"]+\/episode\/[^"]+)"[^>]*>\s*(?:<span[^>]*>)?الحلقة\s*(\d+)(?:[^<]*)<\/a>/gi;
    let match;
    while ((match = episodePattern.exec(html)) !== null) {
        episodes.push({
            href: match[1].trim(),
            number: parseInt(match[2].trim())
        });
    }
    episodes.sort((a, b) => a.number - b.number);
    return episodes;
}

async function extractStreamUrl(html) {
    const streams = [];
    const containerMatch = html.match(/<div class="filter-links-container[^>]*>([\s\S]*?)<\/div>/);
    if (containerMatch) {
        const sources = containerMatch[1].matchAll(/<a[^>]*data-src="([^"]*)"[^>]*>\s*(?:<span[^>]*>)?([^<]*)<\/span>/gi);
        for (const match of sources) {
            const stream = await getStreamFromSource(match[1], match[2]);
            if (stream) streams.push(stream);
        }
    }
    return JSON.stringify({ streams });
}

async function getStreamFromSource(url, quality) {
    if (url.includes('mp4upload.com')) {
        return await handleMp4Upload(url, quality);
    } else if (url.includes('uqload.net')) {
        return await handleUqload(url, quality);
    }
    return null;
}

async function handleMp4Upload(url, quality) {
    const headers = { "Referer": "https://mp4upload.com" };
    const response = await fetchv2(url, { headers });
    const html = await response.text();
    const scriptContent = extractScriptTags(html).find(s => s.includes('player.src'));
    const streamUrl = scriptContent ? scriptContent.split(".src(")[1].split(")")[0].split("src:")[1].split('"')[1] || '' : '';
    return streamUrl ? {
        title: `[${quality}] Mp4upload`,
        streamUrl,
        headers,
        subtitles: null
    } : null;
}

async function handleUqload(url, quality) {
    const headers = {
        "Referer": url,
        "Origin": "https://uqload.net"
    };
    const response = await fetchv2(url, { headers });
    const html = await response.text();
    const videoSrc = html.match(/sources:\s*\[\s*"([^"]+\.mp4)"\s*\]/)?.[1] || '';
    return videoSrc ? {
        title: `[${quality}] Uqload`,
        streamUrl: videoSrc,
        headers,
        subtitles: null
    } : null;
}

function extractScriptTags(html) {
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        scripts.push(match[1]);
    }
    return scripts;
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
