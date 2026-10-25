/* Research cards: each collection reads JSON metadata and images from resources/cards/. */
(() => {
  'use strict';
  const groups = [
    {container: document.getElementById('publication-cards'), directory: 'publications'},
    {container: document.getElementById('ongoing-cards'), directory: 'ongoing'}
  ].filter(group => group.container);
  const cardsRoot = new URL('../resources/cards/', document.baseURI);
  const reloadVersion = Date.now();
  const months = ['JAN.', 'FEB.', 'MAR.', 'APR.', 'MAY', 'JUN.', 'JUL.', 'AUG.', 'SEP.', 'OCT.', 'NOV.', 'DEC.'];
  const monthLabel = (date) => {
    const match = /^(\d{4})-(\d{2})/.exec(date || '');
    return match ? `${months[Number(match[2]) - 1]} ${match[1]}` : date;
  };
  const textEl = (tag, cls, content) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    el.textContent = content;
    return el;
  };
  const cardEl = (card, stem, cardsBase) => {
    const article = document.createElement('article');
    article.className = 'work-card';
    const visual = document.createElement('div');
    visual.className = 'graphic';
    const img = document.createElement('img');
    // An optional `image` filename in the JSON allows either SVG or PNG files.
    // Files must live alongside the card metadata in resources/cards/.
    const requestedImage = card.image;
    const imageFile = typeof requestedImage === 'string' &&
      /^[a-z0-9_-]+\.(?:svg|png|jpe?g|webp)$/i.test(requestedImage)
        ? requestedImage : `${stem}.svg`;
    const imageUrl = new URL(imageFile, cardsBase);
    imageUrl.searchParams.set('v', reloadVersion);
    img.src = imageUrl.href;
    img.alt = `Illustrative figure accompanying: ${card.title}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    visual.append(img);
    const body = document.createElement('div');
    body.className = 'card-body';
    const status = card.status.toUpperCase();
    const statusLabel = card.date ? `${status} · ${monthLabel(card.date)}` : status;
    body.append(textEl('p', 'card-status', statusLabel));
    body.append(textEl('h3', '', card.title));
    body.append(textEl('p', 'card-summary', card.description));
    if (Array.isArray(card.links) && card.links.length) {
      const links = document.createElement('div');
      links.className = 'card-links';
      for (const item of card.links) {
        if (!item || !/^https:\/\//i.test(item.url || '')) continue;
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = item.url;
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden','true');
        arrow.textContent = ' ↗';
        a.append(arrow);
        links.append(a);
      }
      body.append(links);
    }
    article.append(visual, body);
    return article;
  };
  async function load(group) {
    const {container, directory} = group;
    const cardsBase = new URL(`${directory}/`, cardsRoot);
    const res = await fetch(new URL('index.json', cardsBase), {cache: 'no-store'});
    if (!res.ok) throw new Error(`Cards manifest: ${res.status}`);
    const files = await res.json();
    const records = await Promise.all(files.map(async (file, i) => {
      // Manifest may contain only filename-like relative paths, never external URLs.
      if (!/^c\d{3}_[a-z0-9_-]+\.json$/.test(file)) throw new Error('Invalid card filename');
      const response = await fetch(new URL(file, cardsBase), {cache: 'no-store'});
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      const data = await response.json();
      return {data, stem: file.slice(0,-5), index: i};
    }));
    records.sort((a,b) => (b.data.date || '').localeCompare(a.data.date || '') || a.index-b.index);
    container.replaceChildren(...records.map(r => cardEl(r.data, r.stem, cardsBase)));
    container.setAttribute('aria-busy','false');
  }
  groups.forEach(group => load(group).catch((err) => {
    console.error(`Unable to load ${group.directory} research cards:`, err);
    group.container.replaceChildren(textEl('p','cards-error','Unable to load the research cards. Please check the local Jekyll server or refresh the page.'));
    group.container.setAttribute('aria-busy','false');
  }));
})();
