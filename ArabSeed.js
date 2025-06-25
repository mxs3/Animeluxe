async function searchResults(keyword) {
  try {
    const url = `https://arabseed.show/?s=${encodeURIComponent(keyword)}`;
    const html = await soraFetch(url);
    if (!html) throw new Error("Empty response");

    const regex = /<a\s+href="([^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
    const results = [], m;
    while ((m = regex.exec(html)) !== null) {
      results.push({
        title: m[3].trim(),
        image: m[2].startsWith('http') ? m[2] : `https://arabseed.show${m[2]}`,
        href: m[1].startsWith('http') ? m[1] : `https://arabseed.show${m[1]}`
      });
    }

    return JSON.stringify(results.length ? results : [{ title: 'No results found', image: '', href: '' }]);
  } catch (e) {
    console.log('searchResults error', e);
    return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
  }
}

async function extractDetails(url) {
  try {
    const html = await soraFetch(url);
    if (!html) throw new Error("Empty");

    const desc = html.match(/<div[^>]+class="description"[^>]*>([\s\S]+?)<\/div>/);
    const poster = html.match(/<div[^>]+class="poster"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
    const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/);

    return JSON.stringify([{
      title: title ? title[1].trim() : '',
      description: desc ? desc[1].replace(/<[^>]+>/g, '').trim() : '',
      image: poster ? (poster[1].startsWith('http') ? poster[1] : `https://arabseed.show${poster[1]}`) : '',
      aliases: '',
      airdate: ''
    }]);
  } catch (e) {
    console.log('extractDetails error', e);
    return JSON.stringify([{ title: '', description: 'Error', image: '', aliases: '', airdate: '' }]);
  }
}

async function extractEpisodes(url) {
  try {
    const html = await soraFetch(url);
    if (!html) throw new Error("Empty");

    // Check for episode links
    const regex = /<a[^>]+href="([^"]+)"[^>]*>\s*(?:حلقة|Episode)\s*(\d+)[^<]*<\/a>/gi;
    const items = [], m;
    while ((m = regex.exec(html)) !== null) {
      let href = m[1];
      if (!href.startsWith('http')) href = `https://arabseed.show${href}`;
      items.push({
        href,
        number: parseInt(m[2], 10),
        title: `Episode ${m[2]}`
      });
    }

    // If no episodes found, return single-play "movie"
    if (items.length === 0) return JSON.stringify([{ href: url, number: 1, title: 'Watch' }]);

    // Sort episodes by number
    items.sort((a, b) => a.number - b.number);
    return JSON.stringify(items);
  } catch (e) {
    console.log('extractEpisodes error', e);
    return JSON.stringify([{ href: url, number: 1, title: 'Watch' }]);
  }
}

async function extractStreamUrl(url) {
  try {
    const html = await soraFetch(url);
    if (!html) throw new Error("Empty");

    const iframe = html.match(/<iframe[^>]+src="([^"]+)"/);
    return iframe ? iframe[1] : null;
  } catch (e) {
    console.log('extractStreamUrl error', e);
    return null;
  }
}

async function soraFetch(url, opts = { headers: {}, method:'GET', body:null }) {
  try {
    const resp = await fetchv2(url, opts.headers, opts.method, opts.body);
    if (typeof resp === 'string') return resp;
  } catch {}
  try {
    const resp = await fetch(url, opts);
    return await resp.text();
  } catch {
    return null;
  }
}
