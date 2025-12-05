import Dexie from 'dexie';

export const db = new Dexie('GorgonDB_v10');
db.version(1).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type'
});
