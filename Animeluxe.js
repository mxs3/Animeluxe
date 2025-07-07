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
    if (url.includes('vkvideo.ru') || url.includes('vk.com')) {
        return await handleVK(url, quality);
    } else if (url.includes('yourupload.com')) {
        return await handleYourUpload(url, quality);
    }
    return null;
}

async function handleVK(url, quality) {
    const headers = {
        'Referer': url
    };

    try {
        const response = await fetchv2(url, { headers });
        const html = await response.text();
        const hlsMatch = html.match(/"hls":\s*"(https:\\\/\\\/[^"]+\.m3u8[^"]*)"/);
        const streamUrl = hlsMatch ? hlsMatch[1].replace(/\\\//g, '/') : null;

        return streamUrl ? {
            title: `[${quality}] VK`,
            streamUrl,
            headers,
            subtitles: null
        } : null;
    } catch (e) {
        return null;
    }
}

async function handleYourUpload(url, quality) {
    const headers = {
        'Referer': url,
        'Origin': 'https://yourupload.com'
    };

    const response = await fetchv2(url, { headers });
    const html = await response.text();

    const match = html.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+\.mp4)"/i);
    const videoUrl = match ? match[1] : '';

    return videoUrl ? {
        title: `[${quality}] YourUpload`,
        streamUrl: videoUrl,
        headers,
        subtitles: null
    } : null;
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
