import LogService from '../services/logService';

/**
 * Unified Log Parser
 * Parses player.log files and stores them in the unified log format
 * Format: epochSeconds, player, actionContext, logData
 */

// Persistent vendor sessions across incremental parses
// This is critical for live monitoring where transactions may come in separate chunks
const globalVendorSessions = new Map();
const globalInteractions = new Map(); // Also persist interactions for NPC name lookup
let lastKnownCharacter = null;
let lastKnownDate = null;
let currentOpenVendorId = null; // Track which vendor window is CURRENTLY open

// Export function to clear state (useful when manually importing a new log file)
export function resetParserState() {
  globalVendorSessions.clear();
  globalInteractions.clear();
  lastKnownCharacter = null;
  lastKnownDate = null;
  currentOpenVendorId = null;
  console.log('[UnifiedLogParser] Parser state reset');
}

export async function parseAndStoreLog(content, filename = 'unknown') {
  const lines = content.split(/\r?\n/);
  const interactions = globalInteractions; // Use persistent interactions map
  const logEntries = [];

  const startRe = /ProcessStartInteraction\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9.]+)\s*,\s*([^,]+?)\s*,\s*([^,\)\s]+)\s*,?/;
  const vendorRe = /ProcessVendorScreen\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const vendorUpdateRe = /ProcessVendorUpdateAvailableGold\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const loginRe = /Logged in as character\s+(\S+)\.\s+Time UTC=(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/;
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;
  const dateRe = /^\[(\d{4}-\d{2}-\d{2})\s+/;
  const fullDateTimeRe = /^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]/;

  let currentCharacter = null;
  let lastVendorId = null;
  let currentDate = null;
  let lastTime = null;
  
  // Use persistent vendor sessions for live monitoring
  const vendorSessions = globalVendorSessions;
  
  const fallbackDate = new Date().toISOString().split('T')[0];

  // Helper to convert date + time to epoch seconds
  const toEpochSeconds = (date, time) => {
    const dateTime = `${date}T${time}Z`;
    return Math.floor(new Date(dateTime).getTime() / 1000);
  };

  // Try to infer character from localStorage
  const inferCharacterFromLocalStorage = () => {
    if (typeof localStorage === 'undefined') return null;
    const charKeys = Object.keys(localStorage).filter(k => k.startsWith('gorgon_character_'));
    if (charKeys.length > 0) {
      const charName = charKeys[0].replace('gorgon_character_', '');
      console.log(`[UnifiedLogParser] Inferred character from localStorage: ${charName}`);
      return charName;
    }
    return null;
  };

  // Use last known character if available (for live monitoring continuity)
  if (!currentCharacter) {
    currentCharacter = lastKnownCharacter || inferCharacterFromLocalStorage();
  }
  
  // Use last known date if available (for live monitoring continuity)
  if (!currentDate) {
    currentDate = lastKnownDate;
  }

  console.log(`[UnifiedLogParser] Parsing ${filename} with ${lines.length} lines`);

  // Debug: log first few lines to see what we're working with
  if (filename === 'live-player.log') {
    console.log(`[UnifiedLogParser] First 5 lines:`, lines.slice(0, 5));
    console.log(`[UnifiedLogParser] Last 5 lines:`, lines.slice(-5));
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    if (!line) continue;

    // Extract date from line
    let dateTimeMatch = line.match(fullDateTimeRe);
    if (dateTimeMatch) {
      currentDate = dateTimeMatch[1];
    } else {
      const dateMatch = line.match(dateRe);
      if (dateMatch) currentDate = dateMatch[1];
    }

    const timeMatch = line.match(timeRe);
    const time = timeMatch ? timeMatch[1] : null;

    // Detect date rollover
    if (time && lastTime && currentDate) {
      const currentHour = parseInt(time.split(':')[0]);
      const lastHour = parseInt(lastTime.split(':')[0]);
      
      if (lastHour >= 22 && currentHour <= 5) {
        const dateObj = new Date(currentDate + 'T00:00:00Z');
        dateObj.setUTCDate(dateObj.getUTCDate() + 1);
        currentDate = dateObj.toISOString().split('T')[0];
        console.log(`[UnifiedLogParser] Date rollover detected at ${time}, advanced to: ${currentDate}`);
      }
    }
    
    if (time) lastTime = time;

    // Check for character login
    let m = line.match(loginRe);
    if (m) {
      currentCharacter = m[1];
      const month = m[2];
      const day = m[3];
      const year = m[4];
      const loginTime = m[5];
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      const epochSeconds = toEpochSeconds(currentDate, loginTime);
      
      // Log login event
      logEntries.push({
        epochSeconds,
        player: currentCharacter,
        actionContext: 'login',
        logData: { date: currentDate, time: loginTime },
        lineNumber
      });
      
      console.log(`[UnifiedLogParser] Login: ${currentCharacter} on ${currentDate} at ${loginTime} UTC`);
      continue;
    }

    // Check for interaction start
    m = line.match(startRe);
    if (m) {
      // Close any open vendor window when starting a new interaction
      if (currentOpenVendorId) {
        console.log(`[UnifiedLogParser] Closing vendor window ${currentOpenVendorId} (new interaction started)`);
        currentOpenVendorId = null;
      }
      
      const id = m[1];
      const favor = parseFloat(m[3]);
      const flag = m[4].trim();
      const npcName = m[5].trim();
      const interactionKey = `${currentCharacter}_${id}`;
      interactions.set(interactionKey, { id: Number(id), npcName, favor, flag, time, character: currentCharacter });
      continue;
    }

    // Check for vendor screen
    m = line.match(vendorRe);
    if (m) {
      const id = m[1];
      const favorLabel = m[2].trim();
      const balance = Number(m[3]);
      const resetTimer = Number(m[4]);
      const maxBalance = Number(m[5]);

      lastVendorId = Number(id);
      currentOpenVendorId = Number(id); // Mark this vendor as currently open

      const interactionKey = `${currentCharacter}_${id}`;
      const interaction = interactions.get(interactionKey);
      const npcName = interaction ? interaction.npcName : `unknown_${id}`;
      const favor = interaction ? interaction.favor : 0;

      vendorSessions.set(Number(id), {
        balance,
        resetTimer,
        maxBalance,
        character: currentCharacter,
        npc: npcName,
        favorLabel,
        favor,
        time
      });
      
      console.log(`[UnifiedLogParser] Vendor session created: ID=${id}, NPC=${npcName}, Balance=${balance}, MaxBalance=${maxBalance}`);
      console.log(`[UnifiedLogParser] Current open vendor: ${currentOpenVendorId}`);

      const logDate = currentDate || fallbackDate;
      const logTime = time || '00:00:00';
      const epochSeconds = toEpochSeconds(logDate, logTime);

      // Log vendor screen event
      logEntries.push({
        epochSeconds,
        player: currentCharacter,
        actionContext: 'vendor_screen',
        logData: {
          vendorId: Number(id),
          vendorName: npcName,
          balance,
          resetTimer,
          maxBalance,
          favor,
          favorLabel
        },
        lineNumber
      });

      continue;
    }

    // Check for vendor balance update (transaction)
    m = line.match(vendorUpdateRe);
    if (m) {
      const balance = Number(m[1]);
      const resetTimer = Number(m[2]);
      const maxBalance = Number(m[3]);
      
      console.log(`[UnifiedLogParser] Vendor update detected: Balance=${balance}, ResetTimer=${resetTimer}, MaxBalance=${maxBalance}`);
      console.log(`[UnifiedLogParser] Current character: ${currentCharacter}, currentOpenVendorId: ${currentOpenVendorId}`);
      console.log(`[UnifiedLogParser] Active sessions: ${Array.from(vendorSessions.entries()).map(([id, s]) => `ID=${id}(${s.npc},char=${s.character},max=${s.maxBalance},bal=${s.balance})`).join(', ')}`);

      // Match to the CURRENTLY OPEN vendor session
      let matchedVendorId = null;
      let matchedSession = null;

      // The transaction MUST match the currently open vendor window
      if (currentOpenVendorId && vendorSessions.has(currentOpenVendorId)) {
        const session = vendorSessions.get(currentOpenVendorId);
        // Verify the balance actually changed
        if (session.balance !== balance) {
          matchedVendorId = currentOpenVendorId;
          matchedSession = session;
          console.log(`[UnifiedLogParser] ✓ Matched to currentOpenVendorId=${currentOpenVendorId} (${session.npc})`);
        } else {
          console.log(`[UnifiedLogParser] ✗ Balance unchanged for vendor ${currentOpenVendorId}, skipping`);
        }
      } else {
        console.warn(`[UnifiedLogParser] ✗ Cannot match transaction - no currentOpenVendorId or session not found`);
        console.warn(`[UnifiedLogParser]   This usually means no vendor window is currently open in the log context`);
      }

      if (matchedVendorId && matchedSession) {
        const saleAmount = matchedSession.balance - balance;

        if (saleAmount > 0 && currentCharacter) {
          const logDate = currentDate || fallbackDate;
          const logTime = time || '00:00:00';
          const epochSeconds = toEpochSeconds(logDate, logTime);

          // Log transaction
          logEntries.push({
            epochSeconds,
            player: currentCharacter,
            actionContext: 'vendor_transaction',
            logData: {
              vendorId: matchedVendorId,
              vendorName: matchedSession.npc,
              amount: saleAmount,
              balanceBefore: matchedSession.balance,
              balanceAfter: balance
            },
            lineNumber
          });

          console.log(`[UnifiedLogParser] Transaction: ${saleAmount}g to ${matchedSession.npc} at ${logDate} ${logTime}`);
        }

        // Update session
        matchedSession.balance = balance;
        matchedSession.resetTimer = resetTimer;
        matchedSession.time = time;
      }
    }
  }

  // Write all log entries to database
  console.log(`[UnifiedLogParser] Writing ${logEntries.length} log entries to database`);
  let written = 0;
  let skipped = 0;
  for (const entry of logEntries) {
    const result = await LogService.writeLog(
      entry.epochSeconds,
      entry.player,
      entry.actionContext,
      entry.logData,
      entry.lineNumber
    );
    if (result) written++;
    else skipped++;
  }
  console.log(`[UnifiedLogParser] Written: ${written}, Skipped (duplicates): ${skipped}`);

  // Ensure character records exist in localStorage
  if (currentCharacter && typeof localStorage !== 'undefined') {
    const charKey = `gorgon_character_${currentCharacter}`;
    const invKey = `gorgon_inventory_${currentCharacter}`;
    
    if (!localStorage.getItem(charKey)) {
      const minimalChar = {
        data: {
          Name: currentCharacter,
          Currencies: { GOLD: 0 },
          CurrentStats: { MAX_HEALTH: 0, MAX_POWER: 0, MAX_ARMOR: 0 },
          ActiveQuests: [],
          NpcFavor: {},
          Skills: {}
        }
      };
      localStorage.setItem(charKey, JSON.stringify(minimalChar));
      console.log(`[UnifiedLogParser] Created minimal character record for ${currentCharacter}`);
    }
    
    if (!localStorage.getItem(invKey)) {
      const minimalInv = {
        data: {
          Inventory: {},
          StorageVaults: {}
        }
      };
      localStorage.setItem(invKey, JSON.stringify(minimalInv));
      console.log(`[UnifiedLogParser] Created minimal inventory record for ${currentCharacter}`);
    }
  }

  // Update persistent state for next incremental parse
  if (currentCharacter) lastKnownCharacter = currentCharacter;
  if (currentDate) lastKnownDate = currentDate;
  
  console.log(`[UnifiedLogParser] Completed parsing ${filename}. Active vendor sessions: ${vendorSessions.size}`);
  return {
    entriesWritten: written,
    skippedDuplicates: skipped,
    character: currentCharacter
  };
}

export default parseAndStoreLog;
