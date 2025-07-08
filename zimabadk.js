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
    const details = {};

    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>(.*?)<\/h1>/s);
    details.title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "";

    const posterMatch = html.match(/<div class="anime-poster">.*?<img[^>]*src="([^"]+)"/s);
    details.poster = posterMatch ? posterMatch[1] : "";

    const descMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>/s);
    details.description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "";

    const genresMatch = html.match(/النوع<\/small>\s*<small>(.*?)<\/small>/s);
    details.genres = genresMatch ? decodeHTMLEntities(genresMatch[1].trim()).split(/[،,]/).map(g => g.trim()) : [];

    const yearMatch = html.match(/سنة بداية العرض<\/small>\s*<small>(\d{4})<\/small>/s);
    details.year = yearMatch ? yearMatch[1] : "";

    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<li[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;

    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({
            title: decodeHTMLEntities(match[2].trim()),
            url: match[1]
        });
    }

    return episodes.reverse();
}

function decodeHTMLEntities(str) {
    return str.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
}
