async function fetchAndSearch(keyword) {
    const url = `https://ww3.animeluxe.org/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const html = await response.text();
        const results = searchResults(html);
        console.log("Search results:", results);
        return results;
    } catch (error) {
        console.error("Error during fetchAndSearch:", error);
        return [];
    }
}

function searchResults(html) {
    const results = [];

    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">([\s\S]*?)<\/div>\s*<\/div>/g;
    const items = html.match(itemRegex) || [];

    for (const item of items) {
        const urlMatch = item.match(/href="([^"]+)"/);
        const titleMatch = item.match(/alt="([^"]+)"/);
        const imageMatch = item.match(/src="([^"]+)"/);

        if (urlMatch && titleMatch && imageMatch) {
            results.push({
                title: decodeHTMLEntities(titleMatch[1].trim()),
                url: urlMatch[1],
                image: imageMatch[1]
            });
        }
    }

    return results;
}

    return results;
}

function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>\s*<\/div>/s);
    let description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : "";

    const airdateMatch = html.match(/<div class="full-list-info">\s*<small>\s* سنة بداية العرض \s*<\/small>\s*<small[^>]*>(.*?)<\/small>/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : "";

    const genreRegex = /<a href="https:\/\/ww3\.animeluxe\.org\/genre\/[^"]+" rel="tag">([^<]+)<\/a>/g;
    let genres = [];
    let genreMatch;
    while ((genreMatch = genreRegex.exec(html)) !== null) {
        genres.push(genreMatch[1].trim());
    }

    return {
        description,
        airdate,
        genres
    };
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeBlocks = html.split('<div class="episode-info">');
    episodeBlocks.shift();

    for (const block of episodeBlocks) {
        const titleMatch = block.match(/<h1>(.*?)<\/h1>/);
        const dateMatch = block.match(/<span class="publish-date">([^<]+)<\/span>/);
        const tbodyMatch = block.match(/<tbody>([\s\S]*?)<\/tbody>/);

        let downloads = [];
        if (tbodyMatch) {
            const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
            const rows = tbodyMatch[1].match(rowRegex) || [];

            for (const row of rows) {
                const urlMatch = row.match(/data-url="([^"]+)"/);
                const serverMatch = row.match(/domain=([^"&]+)/);
                const qualityMatch = row.match(/<span class="badge dark">([^<]+)<\/span>/);
                const langMatch = row.match(/<span class='hidden-s-down'>\s*(.*?)\s*<\/span>/);

                if (urlMatch) {
                    const base64Url = urlMatch[1];
                    const decodedUrl = atob(base64Url);
                    downloads.push({
                        url: decodedUrl,
                        server: serverMatch ? serverMatch[1] : null,
                        quality: qualityMatch ? qualityMatch[1] : null,
                        language: langMatch ? langMatch[1] : null
                    });
                }
            }
        }

        episodes.push({
            title: titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "",
            date: dateMatch ? dateMatch[1].trim() : "",
            downloads
        });
    }

    return episodes;
}

function decodeHTMLEntities(text) {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
}
