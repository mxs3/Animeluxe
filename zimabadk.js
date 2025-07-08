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
  const regex = /<div class="postBlockOne">[\s\S]*?<a[^>]+href="([^"]+)"[^>]+title="([^"]+)"[^>]*>[\s\S]*?<img[^>]+data-img="([^"]+)"/g;
  let match;
  const seen = new Set();

  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    const title = decodeHTMLEntities(match[2].trim());
    const image = match[3].trim();

    if (!seen.has(title)) {
      results.push({ title, href, image });
      seen.add(title);
    }
  }

  return results;
}

function extractSelectedAnimeData(html) {
  const result = {};

  const titleMatch = html.match(/<h1 class="title"[^>]*>([^<]+)<\/h1>/);
  result.title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';

  const storyMatch = html.match(/<div class="story[^>]*">\s*<p>(.*?)<\/p>/s);
  result.story = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const releaseYearMatch = html.match(/سنة(?:\s+)?الاصدار\s*:<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
  result.releaseYear = releaseYearMatch ? releaseYearMatch[1] : '';

  const genreRegex = /<a[^>]+rel="tag"[^>]*>([^<]+)<\/a>/g;
  const genres = [];
  let genreMatch;
  while ((genreMatch = genreRegex.exec(html)) !== null) {
    genres.push(decodeHTMLEntities(genreMatch[1].trim()));
  }
  result.genres = genres;

  const durationMatch = html.match(/مده(?:\s+)?العرض\s*:<\/span>\s*<strong[^>]*>([^<]+)<\/strong>/);
  result.duration = durationMatch ? decodeHTMLEntities(durationMatch[1].trim()) : '';

  const statusMatch = html.match(/حالة(?:\s+)?الانمي\s*:<\/span>\s*<strong[^>]*>([^<]+)<\/strong>/);
  result.status = statusMatch ? decodeHTMLEntities(statusMatch[1].trim()) : '';

  const studiosMatch = html.match(/الاستديوهات\s*:<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.studios = studiosMatch ? decodeHTMLEntities(studiosMatch[1].trim()) : '';

  const seasonMatch = html.match(/الموسم\s*:<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.season = seasonMatch ? decodeHTMLEntities(seasonMatch[1].trim()) : '';

  return result;
}

function decodeHTMLEntities(text) {
  if (typeof document !== 'undefined') {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  } else {
    return text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/&nbsp;/g, ' ')
               .replace(/&#x[\dA-Fa-f]+;/g, m => String.fromCharCode(parseInt(m.replace(/[&#x;]/g, ''), 16)))
               .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.replace(/[&#;]/g, ''))));
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
