async function searchResults(keyword) {
    const url = `https://www.zimabadk.com/search/${encodeURIComponent(keyword)}/`;
    const response = await soraFetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });
    const html = await response.text();

    const results = [];
    const regex = /<div class="postBlockOne">[\s\S]*?<a\s+class="anime"\s+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+data-img="([^"]+)"[^>]*>[\s\S]*?<h3 class="title">\s*(.*?)\s*<\/h3>/g;

    const seen = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
        const link = match[1].trim();
        const image = match[2].trim();
        const title = match[3].replace(/مشاهدة\s+انمي\s+/gi, '').replace(/\s+مترجم\s+كامل/gi, '').trim();

        if (!seen.has(link)) {
            seen.add(link);
            results.push({
                title: title,
                href: link,
                image: image
            });
        }
    }

    console.log(results);
    return JSON.stringify(results);
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
