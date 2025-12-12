import Dexie from 'dexie';

export const db = new Dexie('GorgonDB_v10');
db.version(1).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type'
});

// Version 2: Add logEntries table for deduplication
db.version(2).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type',
    logEntries: '[filename+lineNumber+timestamp], filename, timestamp, character, type'
});

// Version 3: Add unified logs table
// Format: epochSeconds, player, actionContext, lineNumber, logData
// Index by [epochSeconds+player] for efficient character queries
// Index by [epochSeconds+player+lineNumber] for deduplication
// Index by actionContext for filtering by action type
db.version(3).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type',
    logEntries: '[filename+lineNumber+timestamp], filename, timestamp, character, type',
    logs: '++id, [epochSeconds+player+lineNumber], [epochSeconds+player], player, actionContext, epochSeconds'
});
