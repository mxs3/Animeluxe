async function searchResults(keyword) {
    const url = `https://w1.faselhdxwatch.top/?s=${encodeURIComponent(keyword)}`;
    const html = await soraFetch(url);
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/g)];
    return JSON.stringify(matches.map(([_, href, title, image]) => ({
        title: title.trim(),
        image: image.startsWith("http") ? image : `https://w1.faselhdxwatch.top${image}`,
        href: href.startsWith("http") ? href : `https://w1.faselhdxwatch.top${href}`
    })));
}

async function extractDetails(url) {
    const html = await soraFetch(url);
    const descMatch = html.match(/<div[^>]+class="story"[^>]*>([\s\S]+?)<\/div>/);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'No description available';
    return JSON.stringify([{ description, aliases: 'FaselHD', airdate: 'Unknown' }]);
}

async function extractEpisodes(url) {
    const html = await soraFetch(url);
    const matches = [...html.matchAll(/<a[^>]+href="#server-(\d+)"[^>]*>(.*?)<\/a>/g)];
    return JSON.stringify(matches.map(([, sid, label], i) => ({
        href: `${url}#server-${sid}`,
        number: i + 1,
        title: `Server ${label.trim()}`
    })));
}

async function extractStreamUrl(url) {
    const html = await soraFetch(url.split('#')[0]);
    const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/);
    return iframeMatch ? iframeMatch[1] : null;
}

async function soraFetch(url) {
    try {
        return await fetchv2(url, {}, 'GET', null);
    } catch {
        const res = await fetch(url);
        return await res.text();
    }
}
