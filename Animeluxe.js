async function fetchAndSearch(keyword) {
    const encodedKeyword = encodeURIComponent(keyword);
    try {
        const response = await fetch(`https://ww3.animeluxe.org/?s=${encodedKeyword}`, {
            headers: { 
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/html',
                'Referer': 'https://ww3.animeluxe.org/'
            }
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const html = await response.text();
        return parseSearchResults(html);
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

function parseSearchResults(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items = doc.querySelectorAll('.col-12.col-s-6.col-m-4.col-l-3.media-block');
    
    return Array.from(items).map(item => {
        const title = item.querySelector('.title')?.textContent?.trim() || '';
        const url = item.querySelector('.image')?.href || '';
        const image = item.querySelector('.image img')?.dataset.src || '';
        const type = item.querySelector('.anime-type')?.textContent?.trim() || '';
        const year = item.querySelector('.anime-year')?.textContent?.trim() || '';
        const rating = item.querySelector('.rating span + span')?.textContent?.trim() || '';
        
        return { title, url, image, type, year, rating };
    }).filter(item => item.title && item.url);
}

async function getAnimeDetails(animeUrl) {
    try {
        const response = await fetch(animeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch anime details');
        
        const html = await response.text();
        return parseAnimeDetails(html);
    } catch (error) {
        console.error('Details error:', error);
        return null;
    }
}

function parseAnimeDetails(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const description = doc.querySelector('.content p')?.textContent?.trim() || '';
    
    const genres = Array.from(doc.querySelectorAll('.genres a'))
                     .map(a => a.textContent.trim());
    
    const episodes = Array.from(doc.querySelectorAll('a[href*="/episode/"]'))
        .map(a => {
            const numberMatch = a.querySelector('.episode-number')?.textContent?.match(/\d+/);
            return {
                number: numberMatch ? parseInt(numberMatch[0]) : 0,
                url: a.href
            };
        })
        .sort((a, b) => a.number - b.number);
    
    return { description, genres, episodes };
}

async function getEpisodeStream(episodeUrl) {
    try {
        const response = await fetch(episodeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const html = await response.text();
        const iframeSrc = html.match(/<iframe[^>]*src="([^"]+)"/i)?.[1] || '';
        
        return { streamUrl: iframeSrc };
    } catch (error) {
        console.error('Stream error:', error);
        return { streamUrl: '' };
    }
}
