export function parseLogContent(content) {
  const lines = content.split(/\r?\n/);
  const interactions = new Map();
  const results = [];

  const startRe = /ProcessStartInteraction\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9.]+)\s*,\s*([^,]+?)\s*,\s*([^,\)\s]+)\s*,?/;
  const vendorRe = /ProcessVendorScreen\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const vendorUpdateRe = /ProcessVendorUpdateAvailableGold\(\s*(\d+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const loginRe = /Logged in as character\s+(\S+)\./;
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;

  let currentCharacter = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const timeMatch = line.match(timeRe);
    const time = timeMatch ? timeMatch[1] : null;

    // Check for character login
    let m = line.match(loginRe);
    if (m) {
      currentCharacter = m[1];
      console.log(`Detected character login: ${currentCharacter}`);
      continue;
    }

    m = line.match(startRe);
    if (m) {
      const id = m[1];
      // second value currently unused
      const favor = parseFloat(m[3]);
      const flag = m[4].trim();
      const npcName = m[5].trim();
      // Use character+id as key to prevent overwrites across characters
      const interactionKey = `${currentCharacter}_${id}`;
      interactions.set(interactionKey, { id: Number(id), npcName, favor, flag, time, character: currentCharacter });
      continue;
    }

    m = line.match(vendorRe);
    if (m) {
      const id = m[1];
      const favorLabel = m[2].trim();
      const balance = Number(m[3]);
      const resetTimer = Number(m[4]);
      const maxBalance = Number(m[5]);

      const interactionKey = `${currentCharacter}_${id}`;
      const interaction = interactions.get(interactionKey);
      const npcName = interaction ? interaction.npcName : (`unknown_${id}`);
      const favor = interaction ? interaction.favor : 0;
      const character = interaction ? interaction.character : currentCharacter;

      results.push({
        id: Number(id),
        time,
        npc: npcName,
        vendorName: npcName,
        favorLabel,
        favor,
        balance,
        resetTimer,
        maxBalance,
        character,
      });
      continue;
    }

    // Check for vendor balance update (from transactions)
    m = line.match(vendorUpdateRe);
    if (m) {
      const id = m[1];
      const resetTimer = Number(m[2]);
      const balance = Number(m[3]);

      const interactionKey = `${currentCharacter}_${id}`;
      const interaction = interactions.get(interactionKey);
      const npcName = interaction ? interaction.npcName : (`unknown_${id}`);
      const favor = interaction ? interaction.favor : 0;
      const character = interaction ? interaction.character : currentCharacter;

      // Only add if we don't already have a vendor screen entry for this character+id
      const existingEntry = results.find(r => r.id === Number(id) && r.character === character);
      if (existingEntry) {
        // Update existing entry with new balance and timer
        existingEntry.balance = balance;
        existingEntry.resetTimer = resetTimer;
        existingEntry.time = time; // Update timestamp to latest interaction
      } else {
        // Create new entry from transaction update
        results.push({
          id: Number(id),
          time,
          npc: npcName,
          vendorName: npcName,
          favorLabel: 'Transaction',
          favor,
          balance,
          resetTimer,
          maxBalance: balance, // Use current balance as max since we don't know the actual max
          character,
        });
      }
    }
  }

  // Add any interactions that didn't have a vendor screen
  interactions.forEach((interaction) => {
    // Check if we already added this interaction as a vendor entry
    const alreadyAdded = results.some(r => r.id === interaction.id && r.character === interaction.character);
    if (!alreadyAdded) {
      console.log(`Adding interaction without vendor screen: ${interaction.npcName} for ${interaction.character} (favor: ${interaction.favor})`);
      results.push({
        id: interaction.id,
        time: interaction.time,
        npc: interaction.npcName,
        vendorName: interaction.npcName,
        favorLabel: 'Interaction',
        favor: interaction.favor,
        balance: 0,
        resetTimer: 0,
        maxBalance: 0,
        character: interaction.character,
      });
    }
  });

  console.log(`Parser completed: ${results.length} total entries`);
  results.forEach(r => console.log(`  - ${r.npc} (${r.character}): favor=${r.favor}, label=${r.favorLabel}`));

  return results;
}

export function parseLogFileObject(file) {
  return file.text().then(parseLogContent);
}
