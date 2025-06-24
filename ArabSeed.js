async function searchResults(keyword) {
  try {
    const url = `https://arabseed.show/?s=${encodeURIComponent(keyword)}`;
    const html = await soraFetch(url);
    if (!html) throw new Error("Empty response");

    const regex = /<a\s+href="([^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
    const results = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      results.push({
        title: m[3].trim(),
        image: m[2].startsWith('http') ? m[2] : `https://arabseed.show${m[2]}`,
        href: m[1].startsWith('http') ? m[1] : `https://arabseed.show${m[1]}`
      });
    }

    return JSON.stringify(results.length ? results : [{ title: 'No results', image: '', href: '' }]);
  } catch (e) {
    console.log('searchResults error', e);
    return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
  }
}

async function extractDetails(url) {
  try {
    const html = await soraFetch(url);
    const desc = html.match(/<div[^>]+class="description"[^>]*>([\s\S]+?)<\/div>/);
    const image = html.match(/<div[^>]+class="poster"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
    return JSON.stringify([{
      description: desc ? desc[1].replace(/<[^>]+>/g, '').trim() : '',
      aliases: '',
      airdate: '',
      image: image ? (image[1].startsWith('http') ? image[1] : `https://arabseed.show${image[1]}`) : ''
    }]);
  } catch (e) {
    console.log('extractDetails error', e);
    return JSON.stringify([{ description: 'Error', aliases: '', airdate: '' }]);
  }
}

async function extractEpisodes(url) {
  return JSON.stringify([{ href: url, number: 1, title: 'Watch' }]);
}

async function extractStreamUrl(url) {
  try {
    const html = await soraFetch(url);
    const src = html.match(/<iframe[^>]+src="([^"]+)"/);
    return src ? src[1] : null;
  } catch (e) {
    console.log('extractStreamUrl error', e);
    return null;
  }
}

async function soraFetch(url, opts = { headers: {}, method: 'GET', body: null }) {
  try {
    return await fetchv2(url, opts.headers, opts.method, opts.body);
  } catch {
    const r = await fetch(url, opts);
    return await r.text();
  }
}
