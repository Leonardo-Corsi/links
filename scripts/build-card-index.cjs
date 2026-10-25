const fs = require('fs');
const path = require('path');

const cardName = /^c\d{3}_[a-z0-9_-]+\.json$/i;
const cardsRoot = path.resolve(__dirname, '..', 'resources', 'cards');

for (const collection of ['publications', 'ongoing']) {
  const cardsDir = path.join(cardsRoot, collection);
  const indexPath = path.join(cardsDir, 'index.json');
  const cardFiles = fs.readdirSync(cardsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && cardName.test(entry.name))
    .map(entry => entry.name)
    .sort();
  const index = `${JSON.stringify(cardFiles, null, 2)}\n`;
  const existingIndex = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';

  if (existingIndex !== index) {
    fs.writeFileSync(indexPath, index);
    console.log(`Updated resources/cards/${collection}/index.json (${cardFiles.length} cards).`);
  }
}
