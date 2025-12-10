export function parseLogContent(content, filename = 'unknown') {
  const lines = content.split(/\r?\n/);
  const interactions = new Map();
  const results = [];
  const transactions = []; // Track individual sales transactions
  const logEntries = []; // Track all log entries for deduplication

  const startRe = /ProcessStartInteraction\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9.]+)\s*,\s*([^,]+?)\s*,\s*([^,\)\s]+)\s*,?/;
  const vendorRe = /ProcessVendorScreen\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const vendorUpdateRe = /ProcessVendorUpdateAvailableGold\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const loginRe = /Logged in as character\s+(\S+)\.\s+Time UTC=(\d{2})\/(\d{2})\/(\d{4})\s+/;
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;
  const dateRe = /^\[(\d{4}-\d{2}-\d{2})\s+/;
  const fullDateTimeRe = /^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]/;

  let currentCharacter = null;
  let lastVendorId = null; // Track the most recent vendor screen opened
  let lastVendorBalance = null; // Track balance to calculate sale amount
  let currentDate = null; // Track the date from log file
  let lastTime = null; // Track last timestamp to detect date rollovers
  
  // Track all active vendor sessions to handle busy areas with multiple conversations
  const vendorSessions = new Map(); // key: vendorId, value: { balance, resetTimer, maxBalance, character, npc }
  
  // If no date found in logs, use today's date as fallback
  const fallbackDate = new Date().toISOString().split('T')[0];
  
  // Try to infer character from localStorage if not found in log
  const inferCharacterFromLocalStorage = () => {
    if (typeof localStorage === 'undefined') return null;
    // Look for the most recently modified character data
    const charKeys = Object.keys(localStorage).filter(k => k.startsWith('gorgon_character_'));
    if (charKeys.length > 0) {
      // Just use the first one found - in practice there's usually only one active character per session
      const charName = charKeys[0].replace('gorgon_character_', '');
      console.log(`Inferred character name from localStorage: ${charName}`);
      return charName;
    }
    return null;
  };

  // If no character found in log, try to infer from localStorage at the start
  if (!currentCharacter) {
    currentCharacter = inferCharacterFromLocalStorage();
    if (currentCharacter) {
      console.log(`No 'Logged in as character' line found - using inferred character: ${currentCharacter}`);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed line numbers
    if (!line) continue;
    
    // Check for full date-time format first [2025-12-05 14:30:22]
    let dateTimeMatch = line.match(fullDateTimeRe);
    if (dateTimeMatch) {
      currentDate = dateTimeMatch[1];
      console.log(`Date updated to: ${currentDate}`);
    } else {
      // Fallback to date-only check
      const dateMatch = line.match(dateRe);
      if (dateMatch) currentDate = dateMatch[1];
    }
    
    const timeMatch = line.match(timeRe);
    const time = timeMatch ? timeMatch[1] : null;
    
    // Detect date rollover: if we see a time like 00:xx:xx or 01:xx:xx after 22:xx:xx or 23:xx:xx
    if (time && lastTime && currentDate) {
      const currentHour = parseInt(time.split(':')[0]);
      const lastHour = parseInt(lastTime.split(':')[0]);
      
      // If we go from late evening (22-23) to early morning (00-05), advance the date
      if (lastHour >= 22 && currentHour <= 5) {
        const dateObj = new Date(currentDate + 'T00:00:00Z');
        dateObj.setUTCDate(dateObj.getUTCDate() + 1);
        currentDate = dateObj.toISOString().split('T')[0];
        console.log(`Date rollover detected at ${time}, advanced to: ${currentDate}`);
      }
    }
    
    if (time) lastTime = time;

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

      // Store this vendor session for transaction tracking
      vendorSessions.set(Number(id), {
        balance,
        resetTimer,
        maxBalance,
        character,
        npc: npcName,
        favorLabel,
        favor,
        time
      });

      // Build full timestamp for temporal ordering
      const logDate = currentDate || fallbackDate;
      const timestamp = time ? `${logDate}T${time}Z` : `${logDate}T00:00:00Z`;
      const timestampMs = new Date(timestamp).getTime();

      // Record log entry for deduplication
      logEntries.push({
        filename,
        lineNumber,
        timestamp,
        character,
        type: 'vendor',
        data: { id: Number(id), npcName, favorLabel, balance, resetTimer, maxBalance }
      });

      results.push({
        id: Number(id),
        time,
        timestamp,
        timestampMs,
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

      console.log(`ProcessVendorUpdateAvailableGold: balance=${balance}, resetTimer=${resetTimer}, maxBalance=${maxBalance}`);

      // Try to match this update to an active vendor session
      // Strategy: prefer lastVendorId if it matches maxBalance, otherwise search all sessions
      let matchedVendorId = null;
      let matchedSession = null;
      
      // First try: use lastVendorId if it has matching maxBalance and balance changed
      if (lastVendorId && vendorSessions.has(lastVendorId)) {
        const session = vendorSessions.get(lastVendorId);
        if (session.maxBalance === maxBalance && session.character === currentCharacter && session.balance !== balance) {
          matchedVendorId = lastVendorId;
          matchedSession = session;
          console.log(`Matched to lastVendorId ${lastVendorId} (${session.npc})`);
        }
      }
      
      // Second try: search all sessions for matching maxBalance with balance change
      if (!matchedVendorId) {
        for (const [vendorId, session] of vendorSessions.entries()) {
          if (session.maxBalance === maxBalance && session.character === currentCharacter && session.balance !== balance) {
            matchedVendorId = vendorId;
            matchedSession = session;
            console.log(`Matched to vendor ${vendorId} (${session.npc}) by maxBalance search`);
            break;
          }
        }
      }

      if (matchedVendorId && matchedSession) {
        if (!currentCharacter) {
          console.warn(`Cannot record transaction - no character identified. Try importing a more complete log file.`);
        } else {
          const existingEntry = results.find(r => r.id === matchedVendorId && r.character === currentCharacter);
          if (existingEntry) {
          // Calculate sale amount (difference between balances)
          const saleAmount = matchedSession.balance - balance;
          
          console.log(`Matched vendor ${matchedVendorId} (${matchedSession.npc}): sale amount=${saleAmount} (${matchedSession.balance} - ${balance})`);
          
          if (saleAmount > 0) {
            const transactionDate = currentDate || fallbackDate;
            const transactionTimestamp = time ? `${transactionDate}T${time}Z` : `${transactionDate}T00:00:00Z`;
            
            console.log(`Recording transaction: ${saleAmount} gold to ${matchedSession.npc} on ${transactionDate} at ${time}`);
            
            // Record log entry for transaction
            logEntries.push({
              filename,
              lineNumber,
              timestamp: transactionTimestamp,
              character: currentCharacter,
              type: 'transaction',
              data: { npcId: matchedVendorId, npc: matchedSession.npc, amount: saleAmount }
            });
            
            transactions.push({
              character: currentCharacter,
              npc: matchedSession.npc,
              npcId: matchedVendorId,
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
          
          // Update the session
          matchedSession.balance = balance;
          matchedSession.resetTimer = resetTimer;
          matchedSession.time = time;
          }
        }
      } else {
        console.log(`Could not match vendor update to any session. lastVendorId=${lastVendorId}, Active sessions: ${Array.from(vendorSessions.keys()).join(', ')}`);
      }
    }
  }

  // Add any interactions that didn't have a vendor screen
  interactions.forEach((interaction) => {
    // Check if we already added this interaction as a vendor entry
    const alreadyAdded = results.some(r => r.id === interaction.id && r.character === interaction.character);
    if (!alreadyAdded) {
      console.log(`Adding interaction without vendor screen: ${interaction.npcName} for ${interaction.character} (favor: ${interaction.favor})`);
      const logDate = currentDate || fallbackDate;
      const timestamp = interaction.time ? `${logDate}T${interaction.time}Z` : `${logDate}T00:00:00Z`;
      const timestampMs = new Date(timestamp).getTime();
      
      results.push({
        id: interaction.id,
        time: interaction.time,
        timestamp,
        timestampMs,
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

  console.log(`Parser completed: ${results.length} total entries, ${transactions.length} transactions, ${logEntries.length} log entries`);
  results.forEach(r => console.log(`  - ${r.npc} (${r.character}): favor=${r.favor}, label=${r.favorLabel}`));

  return { vendors: results, transactions, logEntries };
}

export function parseLogFileObject(file) {
  return file.text().then(content => parseLogContent(content, file.name));
}
