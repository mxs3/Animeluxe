async function fetchAndSearch(keyword) {
    const url = `https://ww3.animeluxe.org/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(url, {
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
    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">[\s\S]*?<a href="([^"]+)" class="image lazyactive"[^>]*data-src="([^"]+)"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>/gi;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const image = match[2].trim();
        const title = decodeHTMLEntities(match[3].trim());
        if (href && image && title) {
            results.push({ title, href, image });
        }
    }
    return results;
}

function extractDetails(html) {
    const details = [];
    const decodeHTMLEntities = (text) => {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    };

    const descMatch = html.match(/<div class="media-story">[\s\S]*?<div class="content">\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    let description = descMatch ? decodeHTMLEntities(descMatch[1].trim()).replace(/<\/?[^>]+(>|$)/g, "") : "";

    const airdateMatch = html.match(/<li>\s*سنة العرض\s*:\s*<span>([\d]{4})<\/span>/i);
    let airdate = airdateMatch ? airdateMatch[1].trim() : "";

    const genres = [];
    const genreMatches = html.match(/<a href="[^"]+" class="badge secondary">([^<]+)<\/a>/g);
    if (genreMatches) {
        genreMatches.forEach((genre) => {
            const genreText = genre.match(/>([^<]+)</);
            if (genreText) genres.push(genreText[1].trim());
        });
    }

    const altNames = "";

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
    const decodeHTMLEntities = (text) => {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    };

    const episodeRegex = /<li>[\s\S]*?<a href="([^"]+)"[^>]*class="image lazyactive"[^>]*>[\s\S]*?<h3>الحلقة\s*(\d+)[^<]*<\/h3>/gi;
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
        const tableMatch = html.match(/<div class="media-section">[\s\S]*?<table class="table striped">([\s\S]*?)<\/table>/i);
        if (!tableMatch) {
            return JSON.stringify({ streams: [] });
        }
        const tableHTML = tableMatch[1];
        const rowRegex = /<tr>[\s\S]*?<a href="#" data-url="([^"]+)"[^>]*>[\s\S]*?<div class="server">[\s\S]*?data-src="[^"]+domain=([^"]+)"[^>]*>[\s\S]*?<span class="badge dark">([^<]+)<\/span>[\s\S]*?<div class='flag'>[\s\S]*?<span class='hidden-s-down'>([^<]+)<\/span>/gi;
        let match;
        while ((match = rowRegex.exec(tableHTML)) !== null) {
            const encodedUrl = match[1].trim();
            const server = match[2].trim().replace("www.", "");
            const quality = match[3].trim();
            const language = match[4].trim();
            const streamUrl = atob(encodedUrl);
            multiStreams.streams.push({
                title: `[${quality}] ${server}`,
                streamUrl: streamUrl,
                headers: { "Referer": `https://${server}` },
                subtitles: null
            });
        }
        return JSON.stringify(multiStreams);
    } catch (error) {
        return JSON.stringify({ streams: [] });
    }
}

async function mp4Extractor(url) {
    const headers = {
        "Referer": "https://mp4upload.com"
    };
    const response = await fetch(url, { headers });
    const htmlText = await response.text();
    const streamUrl = extractMp4Script(htmlText);
    return {
        url: streamUrl,
        headers
    };
}

async function uqloadExtractor(url) {
    const headers = {
        "Referer": url,
        "Origin": "https://uqload.net"
    };
    const response = await fetch(url, { headers });
    const htmlText = await response.text();
    const match = htmlText.match(/sources:\s*\[\s*"([^"]+\.mp4)"\s*\]/);
    const videoSrc = match ? match[1] : '';
    return {
        url: videoSrc,
        headers
    };
}

async function vidmolyExtractor(html, url = null) {
    const regexSub = /<option value="([^"]+)"[^>]*>\s*SUB - Omega\s*<\/option>/;
    const regexFallback = /<option value="([^"]+)"[^>]*>\s*Omega\s*<\/option>/;
    const fallback = /<option value="([^"]+)"[^>]*>\s*SUB v2 - Omega\s*<\/option>/;
    let match = html.match(regexSub) || html.match(regexFallback) || html.match(fallback);
    if (match) {
        const decodedHtml = atob(match[1]);
        const iframeMatch = decodedHtml.match(/<iframe\s+src="([^"]+)"/);
        if (!iframeMatch) return null;
        const streamUrl = iframeMatch[1].startsWith("//") ? "https:" + iframeMatch[1] : iframeMatch[1];
        const responseTwo = await fetch(streamUrl);
        const htmlTwo = await responseTwo.text();
        const m3u8Match = htmlTwo.match(/sources:\s*\[\{file:"([^"]+\.m3u8)"/);
        return m3u8Match ? m3u8Match[1] : null;
    } else {
        const sourcesRegex = /sources:\s*\[\{file:"(https?:\/\/[^"]+)"\}/;
        const sourcesMatch = html.match(sourcesRegex);
        return sourcesMatch ? sourcesMatch[1].replace(/'/g, '"') : null;
    }
}

async function vkvideoExtractor(embedUrl) {
    try {
        const response = await fetch(embedUrl);
        const html = await response.text();
        const hlsMatch = html.match(/"hls":\s*"(https:\\\/\\\/[^"]+\.m3u8[^"]*)"/);
        return hlsMatch ? hlsMatch[1].replace(/\\\//g, '/') : null;
    } catch (error) {
        return null;
    }
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
