export function parseLogContent(content) {
  const lines = content.split(/\r?\n/);
  const interactions = new Map();
  const results = [];
  const transactions = []; // Track individual sales transactions

  const startRe = /ProcessStartInteraction\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9.]+)\s*,\s*([^,]+?)\s*,\s*([^,\)\s]+)\s*,?/;
  const vendorRe = /ProcessVendorScreen\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const vendorUpdateRe = /ProcessVendorUpdateAvailableGold\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const loginRe = /Logged in as character\s+(\S+)\.\s+Time UTC=(\d{2})\/(\d{2})\/(\d{4})\s+/;
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;
  const dateRe = /^\[(\d{4}-\d{2}-\d{2})\s+/;

  let currentCharacter = null;
  let lastVendorId = null; // Track the most recent vendor screen opened
  let lastVendorBalance = null; // Track balance to calculate sale amount
  let currentDate = null; // Track the date from log file
  
  // If no date found in logs, use today's date as fallback
  const fallbackDate = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Check for date in log line (format like [2024-12-04 02:40:57])
    const dateMatch = line.match(dateRe);
    if (dateMatch) currentDate = dateMatch[1];
    
    const timeMatch = line.match(timeRe);
    const time = timeMatch ? timeMatch[1] : null;

    // Check for character login
    let m = line.match(loginRe);
    if (m) {
      currentCharacter = m[1];
      // Extract date from UTC timestamp (MM/DD/YYYY format)
      const month = m[2];
      const day = m[3];
      const year = m[4];
      currentDate = `${year}-${month}-${day}`;
      console.log(`Detected character login: ${currentCharacter} on ${currentDate}`);
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

      lastVendorId = Number(id); // Track this vendor for subsequent updates
      lastVendorBalance = balance; // Track initial balance

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

    // Check for vendor balance update (from transactions/sales)
    m = line.match(vendorUpdateRe);
    if (m) {
      const balance = Number(m[1]);
      const resetTimer = Number(m[2]);
      const maxBalance = Number(m[3]);

      console.log(`ProcessVendorUpdateAvailableGold: balance=${balance}, lastVendorBalance=${lastVendorBalance}, lastVendorId=${lastVendorId}`);

      // This updates the most recent vendor screen
      if (lastVendorId && currentCharacter) {
        const existingEntry = results.find(r => r.id === lastVendorId && r.character === currentCharacter);
        if (existingEntry) {
          // Calculate sale amount (difference between balances)
          const saleAmount = lastVendorBalance !== null ? (lastVendorBalance - balance) : 0;
          
          console.log(`Calculated sale amount: ${saleAmount} (${lastVendorBalance} - ${balance})`);
          
          if (saleAmount > 0) {
            const transactionDate = currentDate || fallbackDate;
            // Record the transaction
            const interactionKey = `${currentCharacter}_${lastVendorId}`;
            const interaction = interactions.get(interactionKey);
            const npcName = interaction ? interaction.npcName : existingEntry.npc;
            
            console.log(`Recording transaction: ${saleAmount} gold to ${npcName} on ${transactionDate} at ${time}`);
            
            transactions.push({
              character: currentCharacter,
              npc: npcName,
              npcId: lastVendorId,
              amount: saleAmount,
              date: transactionDate,
              time: time,
              timestamp: resetTimer // Use the reset timer as transaction timestamp
            });
          }
          
          // Update existing entry with new balance and timer after transaction
          existingEntry.balance = balance;
          existingEntry.resetTimer = resetTimer;
          existingEntry.maxBalance = maxBalance;
          existingEntry.time = time; // Update timestamp to latest transaction
          lastVendorBalance = balance; // Update tracked balance
        }
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

  console.log(`Parser completed: ${results.length} total entries, ${transactions.length} transactions`);
  results.forEach(r => console.log(`  - ${r.npc} (${r.character}): favor=${r.favor}, label=${r.favorLabel}`));

  return { vendors: results, transactions };
}

export function parseLogFileObject(file) {
  return file.text().then(parseLogContent);
}
