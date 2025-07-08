async function fetchAndSearch(keyword) {
    const url = `https://www.zimabadk.com/search/${encodeURIComponent(keyword)}/`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });
    const html = await response.text();
    return searchResults(html);
}

function searchResults(html) {
    const results = [];
    const regex = /<a\s+class="anime"\s+href="([^"]+)"[^>]*>\s*<div[^>]*class='poster'>\s*<img[^>]+data-img="([^"]+)"[^>]*>.*?<h3 class="title">\s*(.*?)\s*<\/h3>/gs;
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            url: match[1].trim(),
            image: match[2].trim(),
            title: match[3].trim()
        });
    }
    return results;
}

function extractDetails(html) {
    const decodeHTMLEntities = (str) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    };
    const titleMatch = html.match(/<h1 class="title"[^>]*>(.*?)<\/h1>/s);
    const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "";
    const descMatch = html.match(/<div class="story">\s*(.*?)<\/div>/s);
    const description = descMatch ? decodeHTMLEntities(descMatch[1].replace(/<[^>]+>/g, '').trim()) : "";
    return { title, description };
}

function extractEpisodes(html) {
    const episodes = [];
    const regex = /<li\s+data-ep="(.*?)">\s*<a[^>]+href="(.*?)"[^>]+title="(.*?)">.*?<em>(.*?)<\/em>/gs;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const number = match[1].trim();
        const url = match[2].trim();
        const title = match[3].trim();
        episodes.push({
            episode: number,
            title,
            url
        });
    }
    return episodes;
}

function extractStreamUrl(html) {
    const match = html.match(/<iframe[^>]+src="([^"]+)"/i);
    return match ? match[1].trim() : null;
}

function extractAllServers(html) {
    const servers = [];
    const regex = /<li[^>]+onClick="getServer2\([^,]+,\s*(\d+),\s*(\d+)\);".*?<span[^>]*class="server">(.*?)<\/span>/gs;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const index = match[1].trim();
        const serverId = match[2].trim();
        const name = match[3].trim();
        servers.push({ name, index, serverId });
    }
    return servers;
}
