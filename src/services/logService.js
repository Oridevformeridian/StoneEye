import { db } from '../db';

/**
 * Unified Log Service
 * 
 * Log Format:
 * - epochSeconds: Unix timestamp (seconds since epoch)
 * - player: Character name
 * - actionContext: Type of action (vendor_balance, vendor_screen, vendor_transaction, etc.)
 * - logData: JSON object with action-specific data
 * 
 * Action Contexts:
 * - vendor_screen: { vendorId, vendorName, balance, resetTimer, maxBalance, favor, favorLabel }
 * - vendor_transaction: { vendorId, vendorName, amount, balanceBefore, balanceAfter }
 * - login: { loginTime, date }
 */

export class LogService {
  /**
   * Write a log entry
   */
  static async writeLog(epochSeconds, player, actionContext, logData, lineNumber = 0) {
    // Check for duplicate using composite key
    const existing = await db.logs
      .where('[epochSeconds+player+lineNumber]')
      .equals([epochSeconds, player, lineNumber])
      .first();
    
    if (existing) {
      console.log(`[LogService] Skipping duplicate log: ${player} at ${epochSeconds} line ${lineNumber}`);
      return null;
    }
    
    return await db.logs.add({
      epochSeconds,
      player,
      actionContext,
      logData,
      lineNumber
    });
  }

  /**
   * Get logs for a specific player
   */
  static async getPlayerLogs(player, actionContext = null, startTime = null, endTime = null) {
    let collection = db.logs.where('[epochSeconds+player]');
    
    if (startTime && endTime) {
      // Query range for player
      collection = collection.between([startTime, player], [endTime, player], true, true);
    } else {
      // All logs for player
      collection = collection.between([0, player], [Number.MAX_SAFE_INTEGER, player], true, true);
    }
    
    let logs = await collection.toArray();
    
    // Filter by actionContext if specified
    if (actionContext) {
      logs = logs.filter(log => log.actionContext === actionContext);
    }
    
    return logs.sort((a, b) => a.epochSeconds - b.epochSeconds);
  }

  /**
   * Get vendor balance history for a player
   */
  static async getVendorBalances(player) {
    const logs = await this.getPlayerLogs(player, 'vendor_screen');
    
    // Group by vendor and get most recent entry
    const vendorMap = new Map();
    logs.forEach(log => {
      const vendorId = log.logData.vendorId;
      if (!vendorMap.has(vendorId) || vendorMap.get(vendorId).epochSeconds < log.epochSeconds) {
        vendorMap.set(vendorId, log);
      }
    });
    
    return Array.from(vendorMap.values());
  }

  /**
   * Get transaction history for a player
   */
  static async getTransactions(player, startTime = null, endTime = null) {
    return await this.getPlayerLogs(player, 'vendor_transaction', startTime, endTime);
  }

  /**
   * Get transaction summary (total sales by date)
   */
  static async getTransactionSummary(player) {
    const transactions = await this.getTransactions(player);
    
    const dailySales = {};
    transactions.forEach(tx => {
      const date = new Date(tx.epochSeconds * 1000);
      const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
      dailySales[dateStr] = (dailySales[dateStr] || 0) + tx.logData.amount;
    });
    
    return {
      totalCount: transactions.length,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.logData.amount, 0),
      transactions,
      dailySales
    };
  }

  /**
   * Migrate old transaction data to new format
   */
  static async migrateOldTransactions() {
    console.log('[LogService] Starting migration of old transaction data...');
    
    // Get all old transactions
    const oldTransactions = await db.objects.where('type').equals('transactions').toArray();
    console.log(`[LogService] Found ${oldTransactions.length} old transactions to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const tx of oldTransactions) {
      try {
        // Extract character from refs
        const charRef = tx.refs?.find(r => r.startsWith('character:'));
        const player = charRef ? charRef.replace('character:', '') : 'Unknown';
        
        // Convert timestamp to epoch seconds
        let epochSeconds;
        if (tx.data.timestamp) {
          // Handle both ISO strings and millisecond timestamps
          const isMilliseconds = typeof tx.data.timestamp === 'number' || 
                                (typeof tx.data.timestamp === 'string' && /^\d+$/.test(tx.data.timestamp));
          if (isMilliseconds) {
            epochSeconds = Math.floor(parseInt(tx.data.timestamp) / 1000);
          } else {
            epochSeconds = Math.floor(new Date(tx.data.timestamp).getTime() / 1000);
          }
        } else if (tx.data.date && tx.data.time) {
          // Old format with separate date/time
          const dateTime = `${tx.data.date}T${tx.data.time}Z`;
          epochSeconds = Math.floor(new Date(dateTime).getTime() / 1000);
        } else {
          console.warn('[LogService] Transaction missing timestamp:', tx);
          skippedCount++;
          continue;
        }
        
        // Write to new logs table (lineNumber 0 for migrated data)
        await this.writeLog(
          epochSeconds,
          player,
          'vendor_transaction',
          {
            vendorId: tx.data.npcId,
            vendorName: tx.data.npc,
            amount: tx.data.amount
          },
          0
        );
        
        migratedCount++;
      } catch (err) {
        console.error('[LogService] Error migrating transaction:', tx, err);
        skippedCount++;
      }
    }
    
    console.log(`[LogService] Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
    return { migratedCount, skippedCount };
  }
}

export default LogService;
