function fetchAndSearch(keyword) {
    const encodedKeyword = encodeURIComponent(keyword);
    return fetch(`https://ww3.animeluxe.org/?s=${encodedKeyword}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })
    .then(response => response.text())
    .then(html => searchResults(html));
}

function searchResults(html) {
    const results = [];
    const itemRegex = /<div class="col-12 col-s-6 col-m-4 col-l-3 media-block">([\s\S]*?)<\/div>\s*<\/div>/g;
    const items = html.match(itemRegex) || [];

    items.forEach(item => {
        const urlMatch = item.match(/<a href="([^"]+)" class="image">/);
        const nameMatch = item.match(/<h3 class="title">(.*?)<\/h3>/);
        const imageMatch = item.match(/data-src="([^"]+)"/);
        const typeMatch = item.match(/<span class="anime-type">(.*?)<\/span>/);
        const yearMatch = item.match(/<span class="anime-year">(.*?)<\/span>/);
        const ratingMatch = item.match(/<a href="[^"]+" class="rating"><span>التقييم<\/span>([\d.]+)<\/a>/);

        if (urlMatch && nameMatch) {
            results.push({
                title: nameMatch[1].trim(),
                url: urlMatch[1],
                image: imageMatch ? imageMatch[1] : "",
                type: typeMatch ? typeMatch[1].trim() : "",
                year: yearMatch ? yearMatch[1].trim() : "",
                rating: ratingMatch ? ratingMatch[1].trim() : ""
            });
        }
    });

    return results;
}

function extractAllData(html) {
    const data = {
        description: "",
        genres: [],
        episodes: []
    };

    const decodeHTMLEntities = (text) => {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    };

    const descMatch = html.match(/<div class="content">\s*<p[^>]*>(.*?)<\/p>/s);
    if (descMatch) {
        data.description = decodeHTMLEntities(descMatch[1].trim());
    }

    const genreRegex = /<div class="genres">([\s\S]*?)<\/div>/;
    const genreBlock = html.match(genreRegex);
    if (genreBlock) {
        const genreLinkRegex = /<a[^>]*>(.*?)<\/a>/g;
        let match;
        while ((match = genreLinkRegex.exec(genreBlock[1])) !== null) {
            data.genres.push(match[1].trim());
        }
    }

    const episodeRegex = /<a\s+href="([^"]*?\/episode\/[^"]*?)">[\s\S]*?<div[^>]*class="episode-number"[^>]*>\s*الحلقة\s*(\d+)\s*<\/div>/gi;
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        data.episodes.push({
            href: match[1],
            number: match[2]
        });
    }

    data.episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return data;
}

function extractEpisodesList(html) {
    const episodes = [];

    const episodeRegex = /<li>\s*<a[^>]+href="([^"]+)"[^>]*class="image[^"]*"[^>]*data-src="([^"]+)"[^>]*title="([^"]+)"[^>]*><\/a>\s*<a[^>]*class="title"[^>]*>\s*<h3>\s*الحلقة\s*(\d+)<span>\s*(.*?)\s*<\/span><\/h3>/g;
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({
            number: match[4],
            title: match[5].trim(),
            href: match[1],
            image: match[2]
        });
    }

    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return episodes;
}

function extractDetails(html) {
    const details = [];
    const descriptionMatch = html.match(/<div class="review-content">\s*<p>(.*?)<\/p>\s*<\/div>/s);
    let description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : "";
    const airdateMatch = html.match(/<div class="full-list-info">\s*<small>\s* سنة بداية العرض \s*<\/small>\s*<small>\s*(\d{4})\s*<\/small>\s*<\/div>/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : "";
    const genres = [];
    const aliasesMatch = html.match(/<div class="review-author-info">([\s\S]*?)<\/div>/);
    const inner = aliasesMatch ? aliasesMatch[1] : "";
    const anchorRe = /<a[^>]*class="subtitle mr-1 mt-2 "[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = anchorRe.exec(inner)) !== null) {
        genres.push(m[1].trim());
    }
    if (description && airdate) {
        details.push({
            description: description,
            aliases: genres.join(", "),
            airdate: airdate,
        });
    }
    return details;
}
