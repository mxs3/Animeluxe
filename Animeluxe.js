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
    const info = {};
    const typeMatch = html.match(/النوع\s*:<\s*span>(.*?)<\/span>/);
    const episodesMatch = html.match(/الحلقات\s*:<\s*span>(.*?)<\/span>/);
    const yearMatch = html.match(/سنة العرض\s*:<\s*span>(.*?)<\/span>/);
    const seasonMatch = html.match(/الموسم\s*:<\s*a[^>]*?href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const sourceMatch = html.match(/المصدر\s*:<\s*span>(.*?)<\/span>/);
    const studioMatch = html.match(/الأستوديو\s*:<\s*[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const durationMatch = html.match(/مدة الحلقة\s*:<\s*span>(.*?)<\/span>/);
    const ratingMatch = html.match(/التصنيف\s*:\s*<span>(.*?)<\/span>/);
    const descriptionMatch = html.match(/<div class="content">\s*<p>(.*?)<\/p>/s);
    const genreMatches = [...html.matchAll(/<div class="genres">([\s\S]*?)<\/div>/)];
    const genres = [];

    if (genreMatches.length) {
        const genreTags = [...genreMatches[0][1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)];
        genreTags.forEach(g => genres.push(g[1].trim()));
    }

    info.type = typeMatch ? typeMatch[1].trim() : '';
    info.episodes = episodesMatch ? episodesMatch[1].trim() : '';
    info.year = yearMatch ? yearMatch[1].trim() : '';
    info.season = seasonMatch ? seasonMatch[2].trim() : '';
    info.season_url = seasonMatch ? seasonMatch[1].trim() : '';
    info.source = sourceMatch ? sourceMatch[1].trim() : '';
    info.studio = studioMatch ? studioMatch[2].trim() : '';
    info.studio_url = studioMatch ? studioMatch[1].trim() : '';
    info.duration = durationMatch ? durationMatch[1].trim() : '';
    info.rating = ratingMatch ? ratingMatch[1].trim() : '';
    info.description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : '';
    info.genres = genres;

    return info;
}

function extractEpisodes(html) {
    const episodes = [];
    const epRegex = /<li>\s*<a[^>]+data-src="([^"]+)"[^>]*title="([^"]+)"><\/a>\s*<a[^>]+href="([^"]+)"[^>]*class="title">\s*<h3>([^<]+)<span>([^<]*)<\/span><\/h3><\/a>/g;
    let match;
    while ((match = epRegex.exec(html)) !== null) {
        const image = match[1].trim();
        const titleFull = match[2].trim();
        const url = match[3].trim();
        const epNum = match[4].trim();
        const epName = match[5].trim();
        episodes.push({
            title: `${epNum} ${epName}`.trim(),
            url,
            image
        });
    }
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
