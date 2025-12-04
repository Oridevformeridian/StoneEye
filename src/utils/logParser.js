export function parseLogContent(content) {
  const lines = content.split(/\r?\n/);
  const interactions = new Map();
  const results = [];

  const startRe = /ProcessStartInteraction\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9.]+)\s*,\s*([^,]+?)\s*,\s*([^,\)\s]+)\s*,?/;
  const vendorRe = /ProcessVendorScreen\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const timeMatch = line.match(timeRe);
    const time = timeMatch ? timeMatch[1] : null;

    let m = line.match(startRe);
    if (m) {
      const id = m[1];
      // second value currently unused
      const favor = parseFloat(m[3]);
      const flag = m[4].trim();
      const npcName = m[5].trim();
      interactions.set(id, { id: Number(id), npcName, favor, flag, time });
      continue;
    }

    m = line.match(vendorRe);
    if (m) {
      const id = m[1];
      const favorLabel = m[2].trim();
      const balance = Number(m[3]);
      const resetTimer = Number(m[4]);
      const maxBalance = Number(m[5]);

      const interaction = interactions.get(id);
      const npcName = interaction ? interaction.npcName : (`unknown_${id}`);
      const favor = interaction ? interaction.favor : 0;

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
      });
    }
  }

  // Add any interactions that didn't have a vendor screen
  interactions.forEach((interaction) => {
    // Check if we already added this interaction as a vendor entry
    const alreadyAdded = results.some(r => r.id === interaction.id);
    if (!alreadyAdded) {
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
      });
    }
  });

  return results;
}

export function parseLogFileObject(file) {
  return file.text().then(parseLogContent);
}
