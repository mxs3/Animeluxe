async function fetchAndSearch(keyword) {
    const url = `https://www.zimabadk.com/?s=${encodeURIComponent(keyword)}&type=anime`;
    try {
        const response = await soraFetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        const html = await response.text();
        const results = searchResults(html);
        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        return JSON.stringify([]);
    }
}

async function fetchDetails(pageUrl) {
    const response = await soraFetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await response.text();
    return extractDetails(html);
}

function extractDetails(html) {
    const descMatch = html.match(/<div class="story">([\s\S]*?)<\/div>/);
    const description = descMatch ? descMatch[1].replace(/<\/?[^>]+>/g, '').trim() : '';
    const aliasMatch = html.match(/<h4><i class="fas fa-quote-right"><\/i>\s*ا\/كقصة الانمي<\/div>([\s\S]*?)<div class="headTitle">/);
    const aliases = aliasMatch ? aliasMatch[1].replace(/<\/?[^>]+>/g, '').trim() : '';
    return { description, aliases };
}

async function fetchEpisodes(pageUrl) {
    const response = await soraFetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await response.text();
    return extractEpisodes(html);
}

function extractEpisodes(html) {
    const episodes = [];
    const regex = /<li\s+data-ep="([^"]+)">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*<span>الحلقة<\/span>\s*<em>([^<]+)<\/em>/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
        episodes.push({ episode: m[1].trim(), title: m[3].trim(), href: m[2].trim() });
    }
    return episodes.reverse();
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
