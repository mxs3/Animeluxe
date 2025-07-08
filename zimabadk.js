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

async function extractDetails(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    const details = {
      description: 'N/A',
      aliases: '',
      airdate: 'Unknown'
    };

    const descriptionMatch = html.match(/<div class="content">\s*<p>(.*?)<\/p>\s*<\/div>/s);
    if (descriptionMatch) {
      details.description = decodeHTMLEntities(descriptionMatch[1].trim());
    }

    if (url.includes('movies')) {
      const airdateMatch = html.match(/<li>\s*بداية العرض:\s*<span>\s*<a [^>]*rel="tag"[^>]*>([^<]+)<\/a>/);
      if (airdateMatch) details.airdate = `Released: ${airdateMatch[1].trim()}`;
    } else if (url.includes('animes')) {
      const airdateMatch = html.match(/<li>\s*بداية العرض:\s*<a [^>]*rel="tag"[^>]*>([^<]+)<\/a>/);
      if (airdateMatch) details.airdate = `Aired: ${airdateMatch[1].trim()}`;
    } else {
      throw new Error("URL does not match known anime or movie paths.");
    }

    const genres = [];
    const genresMatch = html.match(/<div\s+class="genres">([\s\S]*?)<\/div>/);
    if (genresMatch) {
      const inner = genresMatch[1];
      const anchorRe = /<a[^>]*>([^<]+)<\/a>/g;
      let m;
      while ((m = anchorRe.exec(inner)) !== null) {
        genres.push(decodeHTMLEntities(m[1].trim()));
      }
      details.aliases = genres.join(', ');
    }

    return JSON.stringify([details]);

  } catch (error) {
    console.log('Details error:', error);
    return JSON.stringify([{
      description: 'Error loading description',
      aliases: 'Aliases: Unknown',
      airdate: 'Aired: Unknown'
    }]);
  }
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
