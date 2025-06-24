async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const html = await soraFetch(`https://w1.faselhdxwatch.top/search/${encodedKeyword}`);

        const results = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/g)];

        const movieData = results.map(([_, href, title, image]) => ({
            title: title.trim(),
            image: image.startsWith("http") ? image : `https://w1.faselhdxwatch.top${image}`,
            href: href.startsWith("http") ? href : `https://w1.faselhdxwatch.top${href}`
        }));

        return JSON.stringify(movieData);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const html = await soraFetch(url);
        const match = html.match(/<div[^>]+class="story"[^>]*>([\s\S]+?)<\/div>/);
        const description = match ? match[1].replace(/<[^>]+>/g, '').trim() : 'No description available';

        return JSON.stringify([{
            description,
            aliases: 'FaselHD',
            airdate: 'Unknown'
        }]);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const html = await soraFetch(url);
        const matches = [...html.matchAll(/<a[^>]+href="#server-(\d+)"[^>]*>(.*?)<\/a>/g)];

        const episodes = matches.map(([, serverId, label], i) => ({
            href: `${url}#server-${serverId}`,
            number: i + 1,
            title: `Server ${label.trim()}`
        }));

        return JSON.stringify(episodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const pageUrl = url.split('#')[0];
        const html = await soraFetch(pageUrl);
        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/);

        return iframeMatch ? iframeMatch[1] : null;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch (e) {
        try {
            const res = await fetch(url);
            return await res.text();
        } catch (error) {
            return null;
        }
    }
}

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function (_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : false;
}

function _0x7E9A(_) {
    return ((___, ____, _____, ______, _______, ________, _________, __________, ___________, ____________) => (
        ____ = typeof ___,
        _____ = ___ && ___["length"],
        ______ = [..."cranci"],
        _______ = ___ ? [...___["toLowerCase"]()] : [],
        ________ = ______["slice"](),
        _______["forEach"]((_________, __________) => {
            ___________ = ______["indexOf"](_________);
            if (__________ >= 0) ______["splice"](__________, 1);
        }),
        ____ === "string" && _____ === 16 && ______["length"] === 0
    ))(_);
}
