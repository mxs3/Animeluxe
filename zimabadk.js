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

function searchResults(html) {
    const results = [];
    const regex = /<div class="postBlockOne">[\s\S]*?<a\s+class="[^"]*"\s+href="([^"]+)"\s+title="([^"]+)">[\s\S]*?<img[^>]+data-img="([^"]+)"/g;
    let match;
    const titlesSet = new Set();
    while ((match = regex.exec(html)) !== null) {
        const href = match[1].trim();
        const title = match[2].trim();
        const image = match[3].trim();
        if (!titlesSet.has(title)) {
            results.push({ title, href, image });
            titlesSet.add(title);
        }
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
