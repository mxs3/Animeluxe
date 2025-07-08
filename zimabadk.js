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

function extractAnimeData(html) {
  const result = {};

  const titleMatch = html.match(/<h1 class="title"[^>]*>([^<]+)<\/h1>/);
  result.title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';

  const storyMatch = html.match(/<div class="story">\s*<p>([^<]+)<\/p>/);
  result.story = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const episodesCountMatch = html.match(/عدد الحلقات\s*:\s*<\/span>\s*<strong>(\d+)<\/strong>/);
  result.episodesCount = episodesCountMatch ? parseInt(episodesCountMatch[1]) : null;

  const genresMatches = [...html.matchAll(/<a href="[^"]+" title="[^"]+">([^<]+)<\/a>/g)];
  result.genres = genresMatches.length ? genresMatches.map(m => decodeHTMLEntities(m[1])) : [];

  const releaseYearMatch = html.match(/سنة الاصدار\s*:\s*<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
  result.releaseYear = releaseYearMatch ? releaseYearMatch[1] : '';

  const durationMatch = html.match(/مده العرض\s*:\s*<\/span>\s*<strong>([^<]+)<\/strong>/);
  result.duration = durationMatch ? durationMatch[1] : '';

  const translationMatch = html.match(/الترجمة\s*:\s*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.translation = translationMatch ? translationMatch[1] : '';

  const statusMatch = html.match(/حالة الانمي\s*:\s*<\/span>\s*<strong>([^<]+)<\/strong>/);
  result.status = statusMatch ? statusMatch[1] : '';

  const studiosMatch = html.match(/الاستديوهات\s*:\s*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.studios = studiosMatch ? studiosMatch[1] : '';

  const seasonMatch = html.match(/الموسم\s*:\s*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.season = seasonMatch ? seasonMatch[1] : '';

  return result;
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
