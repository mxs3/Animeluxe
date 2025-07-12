async function fetchAndSearch(keyword) {
  const url = `https://www.zimabadk.com/?s=${encodeURIComponent(keyword)}&type=anime`;
  try {
    const response = await soraFetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    const results = searchResults(html);
    return JSON.stringify(results);
  } catch {
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
    if (!seen.has(href)) {
      results.push({ title, href, image });
      seen.add(href);
    }
  }

  return results;
}

async function extractDetails(html, currentUrl) {
  const result = {};

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  result.title = titleMatch ? decodeHTMLEntities(titleMatch[1].replace(/[\|\-–].*$/, '').trim()) : '';

  const storyMatch = html.match(/<div class="story">\s*<p>([\s\S]*?)<\/p>/);
  result.description = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const imageMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*class="[^"]*cover[^"]*"/);
  result.image = imageMatch ? imageMatch[1] : '';

  const seasons = [];
  const seasonsList = html.match(/<div class="seasonsList">[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
  if (seasonsList) {
    const seasonRegex = /<a\s+href="([^"]+)">([^<]+)<\/a>/g;
    let seasonMatch;
    while ((seasonMatch = seasonRegex.exec(seasonsList[1])) !== null) {
      seasons.push({
        name: decodeHTMLEntities(seasonMatch[2].trim()),
        href: seasonMatch[1].trim()
      });
    }
  }

  if (seasons.length === 0) {
    seasons.push({ name: 'الموسم الوحيد', href: currentUrl });
  }

  result.seasons = [];

  for (let season of seasons) {
    try {
      const res = await soraFetch(season.href, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const seasonHtml = await res.text();
      const episodes = extractEpisodes(seasonHtml);
      result.seasons.push({
        season: season.name,
        episodes: episodes
      });
    } catch (err) {
      console.error('Season fetch failed:', season.href);
    }
  }

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
    const iframeMatch = html.match(/<div class="postEmbed">[\s\S]*?<iframe[^>]+src="([^"]+)"/);
    if (iframeMatch && iframeMatch[1]) {
      return JSON.stringify({
        streams: [{ url: iframeMatch[1] }]
      });
    }

    const fallbackIframe = html.match(/<iframe[^>]+src="([^"]+)"/);
    if (fallbackIframe && fallbackIframe[1]) {
      return JSON.stringify({
        streams: [{ url: fallbackIframe[1] }]
      });
    }

    return null;
  } catch (err) {
    return null;
  }
}

function decodeHTMLEntities(text) {
  const txt = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (!txt) return text;
  txt.innerHTML = text;
  return txt.value;
}
