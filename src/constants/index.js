export const KNOWN_FILES = [
    'abilities.json', 'abilitykeywords.json', 'advancementtables.json', 'ai.json',
    'areas.json', 'attributes.json', 'directedgoals.json', 'effects.json',
    'items.json', 'itemuses.json', 'landmarks.json', 'lorebookinfo.json',
    'lorebooks.json', 'npcs.json', 'playertitles.json', 'quests.json',
    'recipes.json', 'skills.json', 'storagevaults.json', 'tsysclientinfo.json',
    'tsysprofiles.json', 'xptables.json'
];

export const CATEGORY_META = {
    items: { icon: 'package', label: 'Items', desc: 'Equipment & Loot', gameIconId: 2301 },
    recipes: { icon: 'scroll', label: 'Recipes', desc: 'Crafting Formulas', gameIconId: 5002 },
    skills: { icon: 'book', label: 'Skills', desc: 'Progression', gameIconId: 5005 },
    abilities: { icon: 'zap', label: 'Abilities', desc: 'Combat Moves', gameIconId: 3608 },
    npcs: { icon: 'users', label: 'NPCs', desc: 'Characters', gameIconId: 3402 },
    quests: { icon: 'flag', label: 'Quests', desc: 'Missions', gameIconId: 3301 },
    areas: { icon: 'map', label: 'Areas', desc: 'World Map', gameIconId: 3501 },
    lorebooks: { icon: 'book-open', label: 'Lore', desc: 'Books', gameIconId: 5005 },
    effects: { icon: 'sparkles', label: 'Effects', desc: 'Buffs/Debuffs', gameIconId: 3101 },
    storagevaults: { icon: 'box', label: 'Storage', desc: 'Vaults', gameIconId: 2302 },
    playertitles: { icon: 'award', label: 'Titles', desc: 'Player Titles', gameIconId: 5104 },
    attributes: { icon: 'activity', label: 'Stats', desc: 'Attributes', gameIconId: 3107 },
    ai: { icon: 'cpu', label: 'AI', desc: 'Monster Logic', gameIconId: 3416 },
    tsysclientinfo: { icon: 'gem', label: 'Treasure Mods', desc: 'Loot Enchantments', gameIconId: 3302 },
};

export const FAVOR_LEVELS = ["Neutral", "Comfortable", "Friends", "CloseFriends", "BestFriends", "LikeFamily", "SoulMates"];

export const getCategoryMeta = (filename) => {
    const key = filename.replace('.json', '');
    return {
        key,
        ...(CATEGORY_META[key] || { icon: 'file', label: key.charAt(0).toUpperCase() + key.slice(1), desc: 'Data', gameIconId: 5001 })
    };
};
