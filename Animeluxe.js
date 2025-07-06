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
        console.log("نتائج البحث:", results);
        return results;
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        return [];
    }
}

function searchResults(html) {
    const results = [];
    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">([\s\S]*?)<\/div>/g;
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

    const decodeHTMLEntities = (text) => {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    };

    const descMatch = html.match(/<div class="story">\s*<p[^>]*>([\s\S]*?)<\/p>/);
    let description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "";

    const typeMatch = html.match(/<small>\s*النوع\s*:<\/small>\s*<a[^>]*>\s*([^<]+)\s*<\/a>/);
    let type = typeMatch ? decodeHTMLEntities(typeMatch[1].trim()) : "";

    const episodesMatch = html.match(/<small>\s*الحلقات\s*:<\/small>\s*<small>\s*(\d+)\s*<\/small>/);
    let episodes = episodesMatch ? episodesMatch[1].trim() : "";

    const airdateMatch = html.match(/<small>\s*سنة العرض\s*:<\/small>\s*<small>\s*(\d{4})\s*<\/small>/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : "";

    const seasonMatch = html.match(/<small>\s*الموسم\s*:<\/small>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/);
    let season = seasonMatch ? decodeHTMLEntities(seasonMatch[1].trim()) : "";

    const sourceMatch = html.match(/<small>\s*المصدر\s*:<\/small>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/);
    let source = sourceMatch ? decodeHTMLEntities(sourceMatch[1].trim()) : "";

    const studioMatch = html.match(/<small>\s*الاستوديو\s*:<\/small>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/);
    let studio = studioMatch ? decodeHTMLEntities(studioMatch[1].trim()) : "";

    const durationMatch = html.match(/<small>\s*مدة الحلقة\s*:<\/small>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/);
    let duration = durationMatch ? decodeHTMLEntities(durationMatch[1].trim()) : "";

    const ratingMatch = html.match(/<small>\s*التصنيف\s*:<\/small>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/);
    let rating = ratingMatch ? decodeHTMLEntities(ratingMatch[1].trim()) : "";

    const genres = [];
    const genreRegex = /<button[^>]*class="[^"]*category[^"]*"[^>]*>([^<]+)<\/button>/g;
    let genreMatch;
    while ((genreMatch = genreRegex.exec(html)) !== null) {
        genres.push(genreMatch[1].trim());
    }

    if (description || airdate || episodes || studio || duration || rating || genres.length || type || source || season) {
        details.push({
            description,
            type,
            episodes,
            airdate,
            season,
            source,
            studio,
            duration,
            rating,
            genres: genres.join(", ")
        });
    }

    return details;
}

function extractEpisodes(html) {
    const episodes = [];

    const decodeHTMLEntities = (text) => {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    };

    const episodeCardRegex = /<div class="episode-card"[^>]*>[\s\S]*?<a\s+href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?<span[^>]*>\s*الحلقة\s*(\d+)\s*<\/span>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    let match;

    while ((match = episodeCardRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const number = match[2].trim();
        const title = match[3] ? decodeHTMLEntities(match[3].trim()) : "";
        if (href && number) {
            episodes.push({
                href,
                number,
                title
            });
        }
    }

    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return episodes;
}

async function extractStreamUrl(html) {
    const multiStreams = { streams: [] };
    const containerMatch = html.match(/<div class="filter-links-container overflow-auto" id="streamlinks">([\s\S]*?)<\/div>/);
    if (!containerMatch) {
        return JSON.stringify({ streams: [] });
    }
    const containerHTML = containerMatch[1];
    const mp4uploadMatches = [...containerHTML.matchAll(/<a[^>]*data-src="([^"]*mp4upload\.com[^"]*)"[^>]*>\s*(?:<span[^>]*>)?([^<]*)<\/span>/gi)];
    for (const match of mp4uploadMatches) {
        const embedUrl = match[1].trim();
        const quality = (match[2] || 'Unknown').trim();
        const stream = await mp4Extractor(embedUrl);
        if (stream?.url) {
            let title = `[${quality}] Mp4upload`;
            multiStreams.streams.push({
                title,
                streamUrl: stream.url,
                headers: stream.headers,
                subtitles: null
            });
        }
    }
    const uqloadMatches = [...containerHTML.matchAll(/<a[^>]*data-src="([^"]*uqload\.net[^"]*)"[^>]*>\s*(?:<span[^>]*>)?([^<]*)<\/span>/gi)];
    for (const match of uqloadMatches) {
        const embedUrl = match[1].trim();
        const quality = (match[2] || 'Unknown').trim();
        const stream = await uqloadExtractor(embedUrl);
        if (stream?.url) {
            let title = `[${quality}] Uqload`;
            multiStreams.streams.push({
                title,
                streamUrl: stream.url,
                headers: stream.headers,
                subtitles: null
            });
        }
    }
    const vidmolyMatches = [...containerHTML.matchAll(/<a[^>]*data-src="(\/\/vidmoly\.to[^"]*)"[^>]*>\s*(?:<span[^>]*>)?([^<]*)<\/span>/gi)];
    for (const match of vidmolyMatches) {
        const embedUrl = match[1].trim();
        const quality = (match[2] || 'Unknown').trim();
        const stream = await vidmolyExtractor(embedUrl);
        if (stream?.url) {
            let title = `[${quality}] Vidmoly`;
            multiStreams.streams.push({
                title,
                streamUrl: stream.url,
                headers: {},
                subtitles: null
            });
        }
    }
    const vkvideoMatches = [...containerHTML.matchAll(/<a[^>]*data-src="([^"]*vkvideo\.ru[^"]*)"[^>]*>\s*(?:<span[^>]*>)?([^<]*)<\/span>/gi)];
    for (const match of vkvideoMatches) {
        const embedUrl = match[1].trim();
        const quality = (match[2] || 'Unknown').trim();
        const stream = await vkvideoExtractor(embedUrl);
        if (stream?.url) {
            let title = `[${quality}] VKVideo`;
            multiStreams.streams.push({
                title,
                streamUrl: stream.url,
                headers: {},
                subtitles: null
            });
        }
    }
    return JSON.stringify(multiStreams);
}

async function vidmolyExtractor(html, url = null) {
    const regexSub = /<option value="([^"]+)"[^>]*>\s*SUB - Omega\s*<\/option>/;
    const regexFallback = /<option value="([^"]+)"[^>]*>\s*Omega\s*<\/option>/;
    const fallback = /<option value="([^"]+)"[^>]*>\s*SUB v2 - Omega\s*<\/option>/;
    let match = html.match(regexSub) || html.match(regexFallback) || html.match(fallback);
    if (match) {
        const decodedHtml = atob(match[1]);
        const iframeMatch = decodedHtml.match(/<iframe\s+src="([^"]+)"/);
        if (!iframeMatch) {
            return null;
        }
        const streamUrl = iframeMatch[1].startsWith("//") ? "https:" + iframeMatch[1] : iframeMatch[1];
        const responseTwo = await fetchv2(streamUrl);
        const htmlTwo = await responseTwo.text();
        const m3u8Match = htmlTwo.match(/sources:\s*\[\{file:"([^"]+\.m3u8)"/);
        return m3u8Match ? { url: m3u8Match[1], headers: {} } : null;
    } else {
        const sourcesRegex = /sources:\s*\[\{file:"(https?:\/\/[^"]+)"\}/;
        const sourcesMatch = html.match(sourcesRegex);
        let sourcesString = sourcesMatch ? sourcesMatch[1].replace(/'/g, '"') : null;
        return sourcesString ? { url: sourcesString, headers: {} } : null;
    }
}

async function vkvideoExtractor(embedUrl) {
    try {
        const response = await fetchv2(embedUrl);
        const html = await response.text();
        const hlsMatch = html.match(/"hls":\s*"(https:\\\/\\\/[^"]+\.m3u8[^"]*)"/);
        return hlsMatch ? { url: hlsMatch[1].replace(/\\\//g, '/'), headers: {} } : null;
    } catch (error) {
        return null;
    }
}

async function mp4Extractor(url) {
    const headers = {
        "Referer": "https://mp4upload.com"
    };
    const response = await fetchv2(url, headers);
    const htmlText = await response.text();
    const streamUrl = extractMp4Script(htmlText);
    return {
        url: streamUrl,
        headers: headers
    };
}

async function uqloadExtractor(url) {
    const headers = {
        "Referer": url,
        "Origin": "https://uqload.net"
    };
    const response = await fetchv2(url, headers);
    const htmlText = await response.text();
    const match = htmlText.match(/sources:\s*\[\s*"([^"]+\.mp4)"\s*\]/);
    const videoSrc = match ? match[1] : '';
    return {
        url: videoSrc,
        headers: headers
    };
}

function extractMp4Script(htmlText) {
    const scripts = extractScriptTags(htmlText);
    let scriptContent = scripts.find(script => script.includes('player.src'));
    return scriptContent
        ? scriptContent.split(".src(")[1].split(")")[0].split("src:")[1].split('"')[1] || ''
        : '';
}

function extractScriptTags(html) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        scripts.push(match[1]);
    }
    return scripts;
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = {
        '"': '"',
        '&': '&',
        ''': "'",
        '<': '<',
        '>': '>'
    };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}
```​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​
