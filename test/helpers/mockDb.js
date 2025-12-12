import Dexie from 'dexie';
import 'fake-indexeddb/auto';

/**
 * Create a mock Dexie database for testing
 */
export function createMockDb() {
  const db = new Dexie('TestDB');
  
  // Match production schema
  db.version(1).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type'
  });

  db.version(2).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type',
    logEntries: '[filename+lineNumber+timestamp], filename, timestamp, character, type'
  });

  db.version(3).stores({
    objects: '[type+id], type, name, *refs, [type+category], lastUpdated',
    userData: '[type+id], type',
    logEntries: '[filename+lineNumber+timestamp], filename, timestamp, character, type',
    logs: '++id, [epochSeconds+player+lineNumber], [epochSeconds+player], player, actionContext, epochSeconds'
  });

  return db;
}

/**
 * Seed mock database with test data
 */
export async function seedMockData(db, data = {}) {
  const {
    items = [],
    npcs = [],
    recipes = [],
    abilities = [],
    skills = [],
    logs = []
  } = data;

  if (items.length > 0) {
    await db.objects.bulkPut(items);
  }

  if (npcs.length > 0) {
    await db.objects.bulkPut(npcs);
  }

  if (recipes.length > 0) {
    await db.objects.bulkPut(recipes);
  }

  if (abilities.length > 0) {
    await db.objects.bulkPut(abilities);
  }

  if (skills.length > 0) {
    await db.objects.bulkPut(skills);
  }

  if (logs.length > 0) {
    await db.logs.bulkPut(logs);
  }

  return db;
}

/**
 * Clear all data from mock database
 */
export async function clearMockDb(db) {
  await db.objects.clear();
  await db.userData.clear();
  await db.logEntries?.clear();
  await db.logs?.clear();
}
