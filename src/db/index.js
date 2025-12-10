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
