import React from 'react';
import { render } from '@testing-library/react';

/**
 * Render component with all providers
 * As we add Context providers in Phase 5, they'll be added here
 */
export function renderWithProviders(ui, options = {}) {
  return render(ui, { ...options });
}

/**
 * Create mock character data
 */
export function createMockCharacter(overrides = {}) {
  return {
    type: 'character',
    id: 'TestChar',
    data: {
      Character: 'TestChar',
      Name: 'Test Character',
      Race: 'Human',
      ClassAssignments: ['Druid', 'Sword'],
      Skills: {
        Druid: 50,
        Sword: 45
      },
      ActiveEffects: [],
      ActiveQuests: {},
      CompletedQuests: {},
      Inventory: [],
      ...overrides.data
    },
    ...overrides
  };
}

/**
 * Create mock item data
 */
export function createMockItem(overrides = {}) {
  return {
    type: 'items',
    id: 1000,
    name: 'Test Sword',
    data: {
      ID: 1000,
      InternalName: 'TestSword',
      Name: 'Test Sword',
      Description: 'A test sword',
      SkillRequirements: {
        Sword: 10
      },
      Keywords: ['Weapon', 'Sword'],
      ...overrides.data
    },
    refs: new Set(['skill:Sword']),
    ...overrides
  };
}

/**
 * Create mock NPC data
 */
export function createMockNpc(overrides = {}) {
  return {
    type: 'npcs',
    id: 'NPC_TestVendor',
    name: 'Test Vendor',
    data: {
      ID: 'NPC_TestVendor',
      InternalName: 'NPC_TestVendor',
      Name: 'Test Vendor',
      AreaName: 'Test Zone',
      ...overrides.data
    },
    refs: new Set(),
    ...overrides
  };
}

/**
 * Create mock vendor log entry
 */
export function createMockVendorLog(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    epochSeconds: now,
    player: 'TestChar',
    actionContext: 'vendor',
    lineNumber: 100,
    data: {
      npcName: 'NPC_TestVendor',
      vendorName: 'Test Vendor',
      favor: 500,
      favorLabel: 'Friends',
      balance: 5000,
      maxBalance: 10000,
      resetTimer: now + 86400000, // 24 hours from now
      ...overrides.data
    },
    ...overrides
  };
}

/**
 * Create mock recipe data
 */
export function createMockRecipe(overrides = {}) {
  return {
    type: 'recipes',
    id: 'recipe_1',
    name: 'Test Recipe',
    data: {
      InternalName: 'TestRecipe',
      Name: 'Test Recipe',
      Skill: 'Cooking',
      SkillLevelRequirement: 10,
      Ingredients: {},
      ResultItems: [{ ItemCode: 1000 }],
      ...overrides.data
    },
    refs: new Set(['item:1000']),
    ...overrides
  };
}

/**
 * Create mock ability data
 */
export function createMockAbility(overrides = {}) {
  return {
    type: 'abilities',
    id: 2000,
    name: 'Test Ability',
    data: {
      ID: 2000,
      InternalName: 'TestAbility',
      Name: 'Test Ability',
      Description: 'A test ability',
      Skill: 'Sword',
      Level: 15,
      ...overrides.data
    },
    refs: new Set(['skill:Sword']),
    ...overrides
  };
}
