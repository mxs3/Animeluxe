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

  result.episodes = extractEpisodes(html);

  return result;
}

function extractEpisodes(html) {
  const episodes = [];
  const regex = /<li[^>]*data-ep="(\d+)"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>[^<]*<\/span>\s*<em[^>]*>([^<]+)<\/em>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const epNum = match[3]?.trim();
    const href = match[2]?.trim();
    if (epNum && href) {
      episodes.push({ number: epNum, href: href });
    }
  }
  return episodes;
}

async function extractStreamUrl(html) {
  try {
    const sourceMatch = html.match(/data-video-source="([^"]+)"/);
    let embedUrl = sourceMatch?.[1]?.replace(/&amp;/g, '&');
    if (!embedUrl) return null;

    const cinemaMatch = html.match(/url\.searchParams\.append\(\s*['"]cinema['"]\s*,\s*(\d+)\s*\)/);
    const lastMatch = html.match(/url\.searchParams\.append\(\s*['"]last['"]\s*,\s*(\d+)\s*\)/);
    const cinemaNum = cinemaMatch ? cinemaMatch[1] : undefined;
    const lastNum = lastMatch ? lastMatch[1] : undefined;

    if (cinemaNum) embedUrl += `&cinema=${cinemaNum}`;
    if (lastNum) embedUrl += `&last=${lastNum}`;

    const response = await fetchv2(embedUrl);
    const data = await response.text();

    const qualities = extractQualities(data);

    const epMatch = html.match(/<title>[^<]*الحلقة\s*(\d+)[^<]*<\/title>/);
    const currentEp = epMatch ? Number(epMatch[1]) : null;

    let nextEpNum, nextDuration, nextSubtitle;
    if (currentEp !== null) {
      const episodeRegex = new RegExp(
        `<a[^>]+href="[^"]+/episode/[^/]+/(\\d+)"[\\s\\S]*?` +
        `<span[^>]*>([^<]+)<\\/span>[\\s\\S]*?` +
        `<p[^>]*>([^<]+)<\\/p>`,
        'g'
      );
      let m;
      while ((m = episodeRegex.exec(html)) !== null) {
        const num = Number(m[1]);
        if (num > currentEp) {
          nextEpNum = num;
          nextDuration = m[2].trim();
          nextSubtitle = m[3].trim();
          break;
        }
      }
    }

    if (nextEpNum != null) {
      embedUrl += `&next-title=${encodeURIComponent(nextDuration)}`;
      embedUrl += `&next-sub-title=${encodeURIComponent(nextSubtitle)}`;
    }

    return JSON.stringify({ streams: qualities });
  } catch (err) {
    return null;
  }
}

function extractQualities(html) {
  const match = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];

  const raw = match[1];
  const regex = /\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g;
  const list = [];
  let m;

  while ((m = regex.exec(raw)) !== null) {
    list.push({ quality: m[2], url: m[1] });
  }

  return list;
}

function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}

async function fetchv2(url, options = {}) {
  return await fetch(url, options);
}
