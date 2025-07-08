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

async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const details = [];

        function decodeHTMLEntities(text) {
            return text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .replace(/&apos;/g, "'");
        }

        if (url.includes('/movies/')) {
            const descMatch = html.match(/<div class="content">\s*<p>(.*?)<\/p>/s);
            const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : 'N/A';

            const yearMatch = html.match(/<li>[^<]*سنة العرض[^<]*<\/li>\s*<span>([^<]+)<\/span>/);
            const airdate = yearMatch ? yearMatch[1].trim() : 'Unknown';

            const genres = [];
            const genresBlockMatch = html.match(/<div class="genres">([\s\S]*?)<\/div>/);
            if (genresBlockMatch) {
                const genreLinks = genresBlockMatch[1].match(/<a[^>]*>([^<]+)<\/a>/g) || [];
                genreLinks.forEach(link => {
                    const g = link.match(/>([^<]+)</);
                    if (g) genres.push(decodeHTMLEntities(g[1].trim()));
                });
            }

            details.push({
                description,
                genres: genres.join(', '),
                airdate: `Released: ${airdate}`
            });

        } else if (url.includes('/anime/')) {
            const descMatch = html.match(/<div class="media-story">[\s\S]*?<div class="content">\s*<p>(.*?)<\/p>/s);
            const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : 'N/A';

            const yearMatch = html.match(/<ul class="media-info">[\s\S]*?<li>سنة العرض\s*:\s*<span>([^<]+)<\/span>/);
            const airdate = yearMatch ? yearMatch[1].trim() : 'Unknown';

            const genres = [];
            const genresBlockMatch = html.match(/<div class="genres">([\s\S]*?)<\/div>/);
            if (genresBlockMatch) {
                const genreLinks = genresBlockMatch[1].match(/<a[^>]*>([^<]+)<\/a>/g) || [];
                genreLinks.forEach(link => {
                    const g = link.match(/>([^<]+)</);
                    if (g) genres.push(decodeHTMLEntities(g[1].trim()));
                });
            }

            details.push({
                description,
                genres: genres.join(', '),
                airdate: `Aired: ${airdate}`
            });

        } else {
            throw new Error("URL does not match known anime or movie paths.");
        }

        return JSON.stringify(details);

    } catch (error) {
        return JSON.stringify([{
            description: 'Error loading description',
            genres: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await fetchv2(url);
        const html = typeof response === 'object' ? await response.text() : await response;

        const episodes = [];

        if (url.includes('/movies/')) {
            episodes.push({ number: 1, href: url });
            return JSON.stringify(episodes);
        }

        const liRegex = /<li>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*class="title"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>/g;
        let match;
        while ((match = liRegex.exec(html)) !== null) {
            const href = match[1];
            const title = match[2];
            const numMatch = title.match(/(\d+)/);
            const number = numMatch ? parseInt(numMatch[1]) : null;

            if (number !== null) {
                episodes.push({ number, href });
            }
        }

        return JSON.stringify(episodes);

    } catch (error) {
        return JSON.stringify([]);
    }
}

function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}
