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

function extractSelectedAnimeData(html) {
  const result = {};

  const storyMatch = html.match(/<div class="story[^>]*">\s*<p>(.*?)<\/p>/s);
  result.story = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const releaseYearMatch = html.match(/سنة الاصدار\s*:<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
  result.releaseYear = releaseYearMatch ? releaseYearMatch[1] : '';

  const genresMatches = [...html.matchAll(/<a[^>]+rel="tag"[^>]*>([^<]+)<\/a>/g)];
  result.genres = genresMatches.map(m => decodeHTMLEntities(m[1].trim()));

  return result;
}

function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
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
