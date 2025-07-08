async function fetchAndSearch(keyword) {
  const url = `https://www.zimabadk.com/?s=${encodeURIComponent(keyword)}`;
  const res = await soraFetch(url);
  const html = await res.text();
  return searchResults(html);
}

function searchResults(html) {
  const results = [];
  const regex = /<div class="postBlockOne">.*?<a\s+class=".*?"\s+href="([^"]+)"[^>]*>.*?<div[^>]+class="poster"[^>]*>\s*<img[^>]*data-src="([^"]+)"[^>]*>.*?<h3[^>]*>(.*?)<\/h3>/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push({
      title: match[3].trim(),
      image: match[2].trim(),
      href: match[1].trim()
    });
  }
  return results;
}

async function fetchDetails(url) {
  const res = await soraFetch(url);
  const html = await res.text();
  const details = extractDetails(html);
  const episodes = extractEpisodes(html);
  return {
    ...details,
    episodes: episodes
  };
}

function extractDetails(html) {
  const details = {};
  const descMatch = html.match(/<div class="story">\s*<p>(.*?)<\/p>/s);
  const imgMatch = html.match(/<div class="poster">\s*<img\s+src="([^"]+)"/);
  const titleMatch = html.match(/<h1 class="animeTitle">(.*?)<\/h1>/);
  const statusMatch = html.match(/<div class="info">.*?الحالة<\/strong>\s*:\s*(.*?)<\/div>/s);

  details.description = descMatch ? descMatch[1].trim() : "";
  details.image = imgMatch ? imgMatch[1] : "";
  details.title = titleMatch ? titleMatch[1].trim() : "";
  details.status = statusMatch ? statusMatch[1].trim() : "";

  return details;
}

function extractEpisodes(html) {
  const episodes = [];
  const regex = /<li[^>]*>\s*<a\s+href="([^"]+)"[^>]*>\s*<span>الحلقة<\/span>\s*<em>([^<]+)<\/em>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    episodes.push({
      title: `الحلقة ${match[2]}`,
      href: match[1]
    });
  }
  return episodes.reverse();
}
