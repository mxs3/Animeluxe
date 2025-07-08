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

function extractDetails(html) {
  const imageMatch = html.match(/<div class="image lazyactive" data-src="([^"]+)"/);
  const image = imageMatch ? imageMatch[1] : "";

  const titleMatch = html.match(/<div class="image lazyactive"[^>]+title="([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : "";

  const trailerMatch = html.match(/<a href="([^"]+)" class="btn btn-trailer youtube-bg"/);
  const trailer = trailerMatch ? trailerMatch[1] : "";

  const descMatch = html.match(/<div class="media-story">[\s\S]*?<div class="content">\s*<p>(.*?)<\/p>/);
  const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "";

  const infoMatches = [...html.matchAll(/<li>\s*([^:]+) : (?:<span>(.*?)<\/span>|<a [^>]+>(.*?)<\/a>)/g)];
  const info = {};
  infoMatches.forEach(m => {
    info[m[1].trim()] = m[2] || m[3] || "";
  });

  return {
    title,
    image,
    trailer,
    description,
    type: info["النوع"] || "",
    year: info["سنة العرض"] || "",
    season: info["الموسم"] || "",
    source: info["المصدر"] || "",
    studio: info["الأستوديو"] || "",
    episode_duration: info["مدة الحلقة"] || "",
    rating: info["التصنيف"] || ""
  };
}

function extractEpisodes(html) {
  const episodeRegex = /<li>[\s\S]*?<a href="([^"]+)" class="title">[\s\S]*?<h3>([^<]+)<span>[^<]*<\/span><\/h3>[\s\S]*?<\/a>/g;
  const episodes = [];
  let match;
  while ((match = episodeRegex.exec(html)) !== null) {
    episodes.push({
      url: match[1],
      title: match[2].trim()
    });
  }
  return episodes;
}

async function fetchAnimeDetailsAndEpisodes(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const details = extractDetails(html);
    const episodes = extractEpisodes(html);

    return { details, episodes };
  } catch (e) {
    console.error("Failed fetching anime details and episodes:", e);
    return { details: null, episodes: [] };
  }
}

function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}
