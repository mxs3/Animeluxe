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
