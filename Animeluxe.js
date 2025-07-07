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
    const episodeRegex = /<a[^>]+href="([^"]+\/episodes\/[^"]+)"[^>]*>\s*الحلقة\s*(\d+)/gi;
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const number = match[2].trim();
        episodes.push({ href, number });
    }
    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return episodes;
}

async function extractStreamUrl(html) {
    const multiStreams = { streams: [] };
    try {
        const matches = [...html.matchAll(/<a[^>]*data-url="([^"]+)"[^>]*>تحميل<\/a>[\s\S]*?<div class="server">[\s\S]*?src="([^"]+)"[\s\S]*?<span class='badge dark'>([^<]+)<\/span>/g)];
        for (const match of matches) {
            const encoded = match[1];
            const domain = match[2];
            const quality = match[3];
            const decoded = atob(encoded);
            let extractor = null;
            if (domain.includes("mp4upload.com")) {
                extractor = mp4Extractor;
            } else if (domain.includes("uqload.net")) {
                extractor = uqloadExtractor;
            } else if (domain.includes("vidmoly.to")) {
                extractor = vidmolyExtractor;
            } else if (domain.includes("vkvideo.ru")) {
                extractor = vkvideoExtractor;
            }
            if (extractor) {
                const stream = await extractor(decoded);
                if (stream?.url || typeof stream === "string") {
                    multiStreams.streams.push({
                        title: `[${quality}] ${domain.split("/")[2]}`,
                        streamUrl: stream.url || stream,
                        headers: stream.headers || {},
                        subtitles: null
                    });
                }
            }
        }
    } catch (error) {}
    return JSON.stringify(multiStreams);
}

async function mp4Extractor(url) {
    const headers = { "Referer": "https://mp4upload.com" };
    const res = await fetchv2(url, headers);
    const html = await res.text();
    const src = extractMp4Script(html);
    return { url: src, headers };
}

async function uqloadExtractor(url) {
    const headers = { "Referer": url, "Origin": "https://uqload.net" };
    const res = await fetchv2(url, headers);
    const html = await res.text();
    const match = html.match(/sources:\s*\[\s*"([^"]+\.mp4)"\s*\]/);
    return { url: match ? match[1] : '', headers };
}

async function vidmolyExtractor(url) {
    const res = await fetchv2(url);
    const html = await res.text();
    const match = html.match(/sources:\s*\[\{file:"([^"]+\.m3u8)"/);
    return match ? match[1] : null;
}

async function vkvideoExtractor(url) {
    const res = await fetchv2(url);
    const html = await res.text();
    const match = html.match(/"hls":\s*"(https:\\\/\\\/[^"]+\.m3u8[^"]*)"/);
    return match ? match[1].replace(/\\\//g, '/') : null;
}

function extractMp4Script(htmlText) {
    const scripts = extractScriptTags(htmlText);
    let script = scripts.find(s => s.includes('player.src'));
    if (script) {
        const match = script.match(/src:\s*"([^"]+)"/);
        return match ? match[1] : '';
    }
    return '';
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
    text = text.replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d));
    const entities = { '&quot;': '"', '&amp;': '&', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}
