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
        console.log("Search Results:", results);
        return results;
    } catch (error) {
        console.error("Search Error:", error);
        return [];
    }
}

function searchResults(html) {
    const results = [];
    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">([\s\S]*?)<\/div>\s*<\/div>/g;
    const items = html.match(itemRegex) || [];

    for (const item of items) {
        const urlMatch = item.match(/<a href="([^"]+)"[^>]*>/);
        const titleMatch = item.match(/<div class="titles">[\s\S]*?<h3>(.*?)<\/h3>/);
        const imageMatch = item.match(/<img[^>]+src="([^"]+)"[^>]*>/);

        if (urlMatch && titleMatch && imageMatch) {
            results.push({
                url: urlMatch[1],
                title: titleMatch[1].trim(),
                image: imageMatch[1]
            });
        }
    }

    return results;
}

function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

async function extractDetailsAndEpisodes(html) {
    const details = {};
    const descriptionMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>\s*<\/div>/s);
    details.description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : "";

    const genreRegex = /<div class="genres">([\s\S]*?)<\/div>/;
    const genreMatch = html.match(genreRegex);
    if (genreMatch) {
        const genreItems = [...genreMatch[1].matchAll(/<a[^>]*>(.*?)<\/a>/g)];
        details.genres = genreItems.map(g => decodeHTMLEntities(g[1].trim()));
    } else {
        details.genres = [];
    }

    const episodes = [];
    const episodeRegex = /<li[^>]*>\s*<a href=['"]([^'"]+)['"][^>]*>(.*?)<i[^>]*><\/i><\/a>\s*<\/li>/g;
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({
            title: match[2].trim(),
            url: match[1].trim()
        });
    }

    details.episodes = episodes;
    return details;
}

async function extractEpisodesWithStreams(html) {
    const episodeRegex = /<li[^>]*>\s*<a href=['"]([^'"]+)['"][^>]*>(.*?)<i[^>]*><\/i><\/a>\s*<\/li>/g;
    const episodes = [];
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({
            title: match[2].trim(),
            url: match[1].trim()
        });
    }

    const result = [];

    for (const ep of episodes) {
        try {
            const res = await fetch(ep.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const epHtml = await res.text();

            const qualityRegex = /<td><a[^>]+data-url="([^"]+)"[^>]*>تحميل<\/a><\/td>\s*<td>[\s\S]*?<span class='badge dark'>(\d{3,4}p)<\/span>/g;
            const qualities = {};
            let qmatch;
            while ((qmatch = qualityRegex.exec(epHtml)) !== null) {
                const encodedUrl = qmatch[1];
                const quality = qmatch[2];
                const decodedUrl = atob(encodedUrl);
                if (['480p', '720p', '1080p'].includes(quality)) {
                    qualities[quality] = decodedUrl;
                }
            }

            result.push({
                title: ep.title,
                episodeUrl: ep.url,
                streams: qualities
            });
        } catch (err) {
            result.push({
                title: ep.title,
                episodeUrl: ep.url,
                streams: {},
                error: err.message
            });
        }
    }

    return result;
}
