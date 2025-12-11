/**
 * Log Ingestion Service
 * 
 * Provides a unified interface for processing game logs with proper context tracking.
 * Maintains state across chunks for live monitoring and provides structured data
 * for both ledger and log viewing.
 */

import { db } from '../db';
import { parseLogContent } from '../utils/logParser';

class LogIngestionService {
    constructor() {
        this.context = null;
        this.sessionId = Date.now();
        this.lineOffset = 0;
        this.listeners = new Set();
    }

    /**
     * Subscribe to log ingestion events
     * @param {Function} callback - Called with {type, data}
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Emit event to all listeners
     */
    emit(type, data) {
        this.listeners.forEach(listener => {
            try {
                listener({ type, data });
            } catch (err) {
                console.error('Listener error:', err);
            }
        });
    }

    /**
     * Reset the context (e.g., when starting a new monitoring session)
     */
    resetContext() {
        this.context = null;
        this.lineOffset = 0;
        this.sessionId = Date.now();
        this.emit('context-reset', { sessionId: this.sessionId });
    }

    /**
     * Process log content (can be full file or incremental chunk)
     * @param {string} content - Raw log content
     * @param {Object} options
     * @returns {Promise<Object>} Processing result
     */
    async processLogContent(content, options = {}) {
        const { 
            filename = `session-${this.sessionId}`,
            isIncremental = false,
            skipDeduplication = false 
        } = options;

        this.emit('processing-start', { contentLength: content.length, isIncremental });

        try {
            // Parse with context
            const parseResult = parseLogContent(content, filename, this.context);

            // Update context for next chunk
            if (parseResult.context) {
                this.context = parseResult.context;
            }

            const vendors = parseResult.vendors || [];
            const transactions = parseResult.transactions || [];
            const logEntries = parseResult.logEntries || [];
            const characterName = parseResult.currentCharacter;

            // Adjust line numbers for incremental processing
            if (isIncremental) {
                logEntries.forEach(e => {
                    e.lineNumber += this.lineOffset;
                });
                this.lineOffset += content.split(/\r?\n/).length;
            }

            this.emit('parsed', { 
                vendors: vendors.length, 
                transactions: transactions.length,
                logEntries: logEntries.length,
                character: characterName 
            });

            // Deduplication
            let newLogEntries = logEntries;
            let duplicateCount = 0;

            if (!skipDeduplication && logEntries.length > 0) {
                const timestamps = logEntries.map(e => e.timestamp);
                const potentialDuplicates = await db.logEntries
                    .where('timestamp')
                    .anyOf(timestamps)
                    .toArray();
                
                newLogEntries = logEntries.filter(e => {
                    const isDuplicate = potentialDuplicates.some(existing => 
                        existing.timestamp === e.timestamp && 
                        existing.content === e.content
                    );
                    return !isDuplicate;
                });

                duplicateCount = logEntries.length - newLogEntries.length;
                
                if (duplicateCount > 0) {
                    this.emit('duplicates-skipped', { count: duplicateCount });
                }
            }

            // Store log entries
            if (newLogEntries.length > 0) {
                await db.logEntries.bulkPut(newLogEntries);
                this.emit('log-entries-stored', { count: newLogEntries.length });
            }

            // Process vendors and transactions only if we have new entries
            let storedVendors = 0;
            let storedTransactions = 0;

            if (characterName && newLogEntries.length > 0) {
                // Store vendors
                if (vendors.length > 0) {
                    const vendorEntries = vendors.map(v => {
                        const entryId = `${characterName}_${v.id}_${v.npc}`;
                        const name = v.npc || `vendor_${v.id}`;
                        const refs = [`character:${characterName}`];
                        if (v.npc) {
                            refs.push(`npc:${v.npc}`, `vendor:${v.npc}`);
                        }
                        return {
                            type: 'vendors',
                            id: entryId,
                            name,
                            data: { ...v, character: characterName },
                            refs,
                            category: 'vendor'
                        };
                    });
                    await db.objects.bulkPut(vendorEntries);
                    storedVendors = vendorEntries.length;
                    this.emit('vendors-stored', { count: storedVendors });
                }

                // Store transactions
                if (transactions.length > 0) {
                    const transactionEntries = transactions.map((t, idx) => {
                        const refs = [`character:${characterName}`, `npc:${t.npc}`];
                        return {
                            type: 'transactions',
                            id: `${characterName}_${t.timestamp}_${t.npcId}_${idx}`,
                            name: `Sale to ${t.npc}`,
                            data: t,
                            refs,
                            category: 'transaction'
                        };
                    });
                    await db.objects.bulkPut(transactionEntries);
                    storedTransactions = transactionEntries.length;
                    this.emit('transactions-stored', { 
                        count: storedTransactions,
                        totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
                    });
                }
            }

            const result = {
                success: true,
                character: characterName,
                processed: {
                    logEntries: newLogEntries.length,
                    vendors: storedVendors,
                    transactions: storedTransactions
                },
                skipped: {
                    duplicates: duplicateCount
                },
                raw: {
                    vendors,
                    transactions,
                    logEntries: newLogEntries
                }
            };

            this.emit('processing-complete', result);
            return result;

        } catch (err) {
            this.emit('processing-error', { error: err.message });
            console.error('Log processing error:', err);
            throw err;
        }
    }

    /**
     * Get transaction summary for a character
     */
    async getTransactionSummary(characterId, options = {}) {
        const { startDate, endDate } = options;

        const allTransactions = await db.objects
            .where('type')
            .equals('transactions')
            .toArray();

        let charTransactions = allTransactions.filter(t => 
            t.refs && t.refs.includes(`character:${characterId}`)
        );

        // Filter by date if specified
        if (startDate || endDate) {
            charTransactions = charTransactions.filter(t => {
                const txDate = t.data.date;
                if (startDate && txDate < startDate) return false;
                if (endDate && txDate > endDate) return false;
                return true;
            });
        }

        // Group by date
        const dailySales = {};
        const vendorSales = {};

        charTransactions.forEach(t => {
            const date = t.data.date;
            const vendor = t.data.npc;
            const amount = t.data.amount || 0;

            if (date) {
                dailySales[date] = (dailySales[date] || 0) + amount;
            }
            if (vendor) {
                vendorSales[vendor] = (vendorSales[vendor] || 0) + amount;
            }
        });

        return {
            transactions: charTransactions,
            totalAmount: charTransactions.reduce((sum, t) => sum + (t.data.amount || 0), 0),
            totalCount: charTransactions.length,
            dailySales,
            vendorSales
        };
    }

    /**
     * Get vendor favor history for a character
     */
    async getVendorHistory(characterId) {
        const vendorEntries = await db.objects
            .where('type')
            .equals('vendors')
            .toArray();

        return vendorEntries.filter(v => 
            v.data && v.data.character === characterId
        );
    }

    /**
     * Get structured log entries for display
     */
    async getLogEntries(options = {}) {
        const { 
            character, 
            type, 
            startDate, 
            endDate, 
            limit = 100 
        } = options;

        let query = db.logEntries;

        if (startDate && endDate) {
            query = query.where('timestamp').between(startDate, endDate, true, true);
        } else if (startDate) {
            query = query.where('timestamp').aboveOrEqual(startDate);
        } else if (endDate) {
            query = query.where('timestamp').belowOrEqual(endDate);
        }

        let entries = await query.limit(limit).toArray();

        // Filter by character and type if specified
        if (character) {
            entries = entries.filter(e => e.character === character);
        }
        if (type) {
            entries = entries.filter(e => e.type === type);
        }

        return entries.map(e => ({
            timestamp: e.timestamp,
            type: e.type,
            character: e.character,
            content: e.content,
            data: e.data,
            filename: e.filename,
            lineNumber: e.lineNumber
        }));
    }
}

// Export singleton instance
export const logIngestion = new LogIngestionService();
export default logIngestion;
