import Dexie from 'dexie';

export const db = new Dexie('GorgonDB_v9');
db.version(1).stores({
    objects: '[type+id], type, name, *refs, [type+category]',
    userData: '[type+id], type'
});
