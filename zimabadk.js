async function fetchAndSearch(keyword) {
  const url = `https://www.zimabadk.com/?s=${encodeURIComponent(keyword)}&type=anime`;
  try {
    const response = await soraFetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    const results = searchResults(html);
    return JSON.stringify(results);
  } catch (error) {
    return JSON.stringify([]);
  }
}

function searchResults(html) {
  const results = [];
  const regex = /<div class="postBlockOne">[\s\S]*?<a[^>]+href="([^"]+)"[^>]+title="([^"]+)"[^>]*>[\s\S]*?<img[^>]+data-img="([^"]+)"/g;
  const seen = new Set();
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    const fullTitle = decodeHTMLEntities(match[2].trim());
    const title = fullTitle.match(/[a-zA-Z0-9: \-]+/)?.[0]?.trim() || fullTitle;
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

  const storyMatch = html.match(/<div class="story">\s*<p>([\s\S]*?)<\/p>/);
  result.description = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const releaseYearMatch = html.match(/سنة الاصدار\s*:\s*<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
  result.releaseYear = releaseYearMatch ? releaseYearMatch[1].trim() : '';

  const airedDateMatch = html.match(/بدأ عرضه من\s*:\s*<\/span>\s*<strong>([^<]+)<\/strong>/);
  result.airedDate = airedDateMatch ? airedDateMatch[1].trim() : '';

  const genres = [];
  const genresBlockMatch = html.match(/الانواع\s*:\s*<\/span>([\s\S]*?)<\/li>/);
  if (genresBlockMatch) {
    const genreRegex = /<a[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = genreRegex.exec(genresBlockMatch[1])) !== null) {
      genres.push(decodeHTMLEntities(m[1].trim()));
    }
  }
  result.genres = genres;

  const categories = [];
  const categoriesBlockMatch = html.match(/التصنيفات\s*:\s*<\/span>([\s\S]*?)<\/li>/);
  if (categoriesBlockMatch) {
    const catRegex = /<a[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = catRegex.exec(categoriesBlockMatch[1])) !== null) {
      categories.push(decodeHTMLEntities(m[1].trim()));
    }
  }
  result.categories = categories;

  result.seasons = extractSeasons(html);
  result.episodes = extractEpisodes(html); // دي مؤقتًا بتجيب اللي ظاهر فقط

  return result;
}

function extractSeasons(html) {
  const seasons = [];
  const regex = /<li>\s*<a href="([^"]+)">\s*([^<]+)\s*<\/a>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    const title = decodeHTMLEntities(match[2].trim());
    seasons.push({ title, href });
  }

  return seasons;
}

function extractEpisodes(html) {
  const episodes = [];
  const regex = /<li[^>]*data-ep="(\d+)"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[\s\S]*?<em[^>]*>([^<]+)<\/em>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const epNum = match[3]?.trim();
    const href = match[2]?.trim();
    if (epNum && href) {
      episodes.push({ number: epNum, href });
    }
  }
  return episodes;
}

async function extractStreamUrl(html) {
  try {
    let embedUrl = null;

    const sourceMatch = html.match(/data-video-source="([^"]+)"/);
    if (sourceMatch) {
      embedUrl = sourceMatch[1].replace(/&amp;/g, '&');

      const cinema = html.match(/cinema['"]\s*,\s*(\d+)/)?.[1];
      const last = html.match(/last['"]\s*,\s*(\d+)/)?.[1];
      if (cinema) embedUrl += `&cinema=${cinema}`;
      if (last) embedUrl += `&last=${last}`;
    }

    if (!embedUrl) {
      const iframeMatch = html.match(/<iframe[^>]+src="([^"]+sendvid\.com\/embed\/[^"]+)"/);
      if (iframeMatch) {
        return JSON.stringify({
          streams: [{ quality: "Auto", url: iframeMatch[1] }]
        });
      }
      return null;
    }

    const res = await fetchv2(embedUrl);
    const data = await res.text();

    // نحاول JSON مباشرة أولاً
    const jsonMatch = data.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
    if (!jsonMatch) return null;

    let qualities = [];
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      qualities = parsed.map(item => ({
        quality: item.label,
        url: item.src
      }));
    } catch {
      const regex = /\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g;
      let m;
      while ((m = regex.exec(jsonMatch[1])) !== null) {
        qualities.push({ quality: m[2], url: m[1] });
      }
    }

    return JSON.stringify({ streams: qualities });
  } catch (err) {
    return null;
  }
}

function decodeHTMLEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchv2(url, options = {}) {
  return await fetch(url, options);
}
