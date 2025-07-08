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
  const regex = /<div class="postBlockOne">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img[^>]*data-img="([^"]+)"/g;
  let match;
  const seen = new Set();

  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    const title = decodeHTMLEntities(match[2].trim());
    const image = match[3].trim();

    if (!seen.has(href)) {
      results.push({ title, href, image });
      seen.add(href);
    }
  }

  return results;
}

function extractDetails(html) {
  const result = {};

  const titleMatch = html.match(/<h1 class="title"[^>]*>([^<]+)<\/h1>/);
  result.title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';

  const storyMatch = html.match(/<div class="story[^>]*">\s*<p[^>]*>([\s\S]*?)<\/p>/);
  result.story = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const releaseYearMatch = html.match(/سنة\s*الاصدار[^<]*<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
  result.releaseYear = releaseYearMatch ? releaseYearMatch[1] : '';

  const genreRegex = /<a[^>]+rel="tag"[^>]*>([^<]+)<\/a>/g;
  const genres = [];
  let match;
  while ((match = genreRegex.exec(html)) !== null) {
    const genre = decodeHTMLEntities(match[1].trim());
    if (!genres.includes(genre)) genres.push(genre);
  }
  result.genres = genres;

  const statusMatch = html.match(/حالة\s*الانمي[^<]*<\/span>\s*<strong[^>]*>([^<]+)<\/strong>/);
  result.status = statusMatch ? decodeHTMLEntities(statusMatch[1].trim()) : '';

  const studiosMatch = html.match(/الاستديوهات[^<]*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.studios = studiosMatch ? decodeHTMLEntities(studiosMatch[1].trim()) : '';

  const seasonMatch = html.match(/الموسم[^<]*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  result.season = seasonMatch ? decodeHTMLEntities(seasonMatch[1].trim()) : '';

  return result;
}

function extractEpisodes(html) {
  const episodes = [];
  const regex = /<li[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*class="title"[^>]*>\s*<h3[^>]*>([^<]+)<\/h3>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const title = match[2];
    const numberMatch = title.match(/(\d+)/);
    if (numberMatch) {
      episodes.push({ number: parseInt(numberMatch[1]), href });
    }
  }

  return episodes;
}

function decodeHTMLEntities(text) {
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));

  const entities = {
    '&quot;': '"',
    '&amp;': '&',
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' '
  };

  for (const entity in entities) {
    text = text.replace(new RegExp(entity, 'g'), entities[entity]);
  }

  return text;
}
