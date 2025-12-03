import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../components/Icon';
import GameIcon from '../components/GameIcon';
import { db } from '../db';
import { FAVOR_LEVELS } from '../constants';
import { parseLogFileObject } from '../utils/logParser.js';

const MyCharacterView = ({ onNavigate, goToIngest }) => {
    const [activeTab, setActiveTab] = useState('stats');
    const [charData, setCharData] = useState(null);
    const [selectedCharId, setSelectedCharId] = useState(null);
    const [availableChars, setAvailableChars] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'Name', direction: 'asc' });
    const [netWorth, setNetWorth] = useState(0);
    const [showAllInventory, setShowAllInventory] = useState(false);
    const [storageFilter, setStorageFilter] = useState(null);
    const [storageMeta, setStorageMeta] = useState({});
    const [encumbrance, setEncumbrance] = useState({ used: 0, shared: 0 });
    const [questStats, setQuestStats] = useState({});
    const [showQuestList, setShowQuestList] = useState(false);
    const [confirmPurgeVendors, setConfirmPurgeVendors] = useState(false);
    const [vendorData, setVendorData] = useState([]);
    const [hideNoStorage, setHideNoStorage] = useState(false);

    const handleCharLogUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !selectedCharId) return;
        try {
            for (const file of files) {
                const parsed = await parseLogFileObject(file);
                if (parsed && parsed.length > 0) {
                    const entries = parsed.map(p => {
                        const entryId = `${selectedCharId}_${p.id}_${p.npc}`;
                        const name = p.npc || (`vendor_${p.id}`);
                        const refs = [];
                        refs.push(`character:${selectedCharId}`);
                        if (p.npc) refs.push(`npc:${p.npc}`);
                        if (p.npc) refs.push(`vendor:${p.npc}`);
                        return {
                            type: 'vendors',
                            id: entryId,
                            name,
                            data: { ...p, character: selectedCharId },
                            refs,
                            category: 'vendor'
                        };
                    });
                    await db.objects.bulkPut(entries);
                }
            }
        } catch (err) { console.error('Log import error', err); }
    };

    const handlePurgeVendorLogs = async () => {
        if (!confirmPurgeVendors) {
            setConfirmPurgeVendors(true);
            setTimeout(() => setConfirmPurgeVendors(false), 4000);
            return;
        }
        if (!selectedCharId) return;
        try {
            const vendorEntries = await db.objects.where('type').equals('vendors').toArray();
            const toPurge = vendorEntries.filter(e => e.data && e.data.character === selectedCharId);
            const ids = toPurge.map(e => [e.type, e.id]);
            await db.objects.bulkDelete(ids);
            setConfirmPurgeVendors(false);
        } catch (err) { console.error('Vendor purge error', err); }
    };

    useEffect(() => {
        const loadChars = () => {
            const chars = new Set();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('gorgon_character_')) {
                    chars.add(key.replace('gorgon_character_', ''));
                }
                if (key.startsWith('gorgon_inventory_')) {
                    chars.add(key.replace('gorgon_inventory_', ''));
                }
            }
            const charList = Array.from(chars).sort();
            setAvailableChars(charList);
            if (charList.length > 0 && !selectedCharId) {
                setSelectedCharId(charList[0]);
            }
            setLoading(false);
        };
        loadChars();
    }, []);

    // Helper: split CamelCase / PascalCase / snake_case into words
    const splitNameToWords = (name) => {
        if (!name) return [''];
        // Replace underscores and hyphens with spaces first
        const cleaned = name.replace(/[_\-]+/g, ' ');
        // Match sequences: capitals followed by lowercases, consecutive capitals, or numbers
        const matches = cleaned.match(/[A-Z]{2,}(?=[A-Z][a-z]|\b)|[A-Z]?[a-z]+|[0-9]+/g);
        if (matches && matches.length > 0) return matches;
        // Fallback: split on spaces
        return cleaned.split(/\s+/);
    };

    const wikiSearchUrlFor = (questName) => {
        const words = splitNameToWords(questName).map(w => encodeURIComponent(w.toLowerCase()));
        const q = words.join('+');
        return `https://wiki.projectgorgon.com/w/index.php?search=${q}&title=Special%3ASearch&go=Go`;
    };

    useEffect(() => {
        if (!selectedCharId && !showAllInventory) return;
        setLoading(true);

        const loadData = async () => {
            try {
                const vaults = await db.objects.where('type').equals('storagevaults').toArray();
                const npcs = await db.objects.where('type').equals('npcs').toArray();
                const vaultMap = {};
                vaults.forEach(v => {
                    if (v.data.NpcFriendlyName) vaultMap[`NPC_${v.data.NpcFriendlyName}`] = v.data;
                    if (v.name) vaultMap[v.name] = v.data; 
                });

                let currentCharData = null;

                if (selectedCharId) {
                    const cStr = localStorage.getItem(`gorgon_character_${selectedCharId}`);
                    currentCharData = cStr ? JSON.parse(cStr) : null;

                    if (currentCharData) {
                        setCharData(currentCharData.data);
                        const allStaticAbilities = await db.objects.where('type').equals('abilities').toArray();
                        const abilityCounts = {}; 
                        allStaticAbilities.forEach(ab => {
                            if (ab.data.Skill) {
                                abilityCounts[ab.data.Skill] = (abilityCounts[ab.data.Skill] || 0) + 1;
                            }
                        });

                        const allStaticSkills = await db.objects.where('type').equals('skills').toArray();
                        const skillMap = new Map();
                        allStaticSkills.forEach(s => {
                            skillMap.set(s.name, s);
                            skillMap.set(s.id, s);
                            if(s.data.InternalName) skillMap.set(s.data.InternalName, s);
                        });

                        const skillList = [];
                        if (currentCharData.data.Skills) {
                             for (const [name, data] of Object.entries(currentCharData.data.Skills)) {
                                 if (name.toLowerCase().includes('internal')) continue;
                                 
                                 let icon = 5005;
                                 let dbId = null;
                                 const match = skillMap.get(name) || skillMap.get(`Skill_${name}`);
                                 
                                 if(match) {
                                     icon = match.derivedIcon || match.data.IconId || match.data.IconID;
                                     dbId = match.id;
                                 }
                                 
                                 let abilitiesLearned = 0;
                                 if (data.Abilities) {
                                     abilitiesLearned = data.Abilities.length;
                                 }
                                 
                                 let abilitiesAvailable = 0;
                                 abilitiesAvailable = allStaticAbilities.filter(ab => {
                                     if (ab.name.toLowerCase().includes('internal')) return false;
                                     const matchesSkill = ab.data.Skill === name || ab.data.Skill === `Skill_${name}`;
                                     if (!matchesSkill) return false;
                                     const reqLevel = ab.data.Level || 0;
                                     return reqLevel <= data.Level;
                                 }).length;
                                 
                                 if (abilitiesLearned > abilitiesAvailable) abilitiesAvailable = abilitiesLearned;

                                 skillList.push({ 
                                     name, 
                                     level: data.Level, 
                                     icon, 
                                     id: dbId,
                                     xpCurrent: data.XpTowardNextLevel || 0,
                                     xpNext: data.XpNeededForNextLevel || 0,
                                     abilitiesLearned,
                                     abilitiesAvailable
                                 });
                             }
                        }
                        setSkills(skillList.sort((a, b) => b.level - a.level));
                    } else {
                        setCharData(null);
                        setSkills([]);
                    }
                }

                let itemsToProcess = [];
                let targetChars = showAllInventory ? availableChars : [selectedCharId];
                const sharedVaultOwners = new Map();

                for (const charId of targetChars) {
                    if (!charId) continue;
                    const iStr = localStorage.getItem(`gorgon_inventory_${charId}`);
                    if (iStr) {
                        const iData = JSON.parse(iStr);
                        if (iData && iData.data && iData.data.Items) {
                            const charItems = iData.data.Items.map(item => ({
                                ...item,
                                _owner: charId
                            }));
                            itemsToProcess = itemsToProcess.concat(charItems);
                        }
                    }
                }

                let storageUsage = {};
                let storageCounts = { used: 0, shared: 0 };

                if (itemsToProcess.length > 0) {
                    const knownRecipes = new Set();
                    if (selectedCharId) {
                        const cStr = localStorage.getItem(`gorgon_character_${selectedCharId}`);
                        if (cStr) {
                            const cData = JSON.parse(cStr);
                            if (cData.data.RecipeCompletions) {
                                 Object.keys(cData.data.RecipeCompletions).forEach(k => knownRecipes.add(k));
                            }
                        }
                    }

                    const typeIds = new Set(itemsToProcess.map(i => i.TypeID));
                    const itemMetaMap = {};
                    for (const tid of typeIds) {
                         const staticItem = await db.objects.get({ type: 'items', id: tid });
                         if (staticItem) {
                             itemMetaMap[tid] = { 
                                 icon: staticItem.data.IconId,
                                 recipes: staticItem.data.Recipes 
                             };
                         }
                    }
                    
                    let invValue = 0;
                    const processedItems = [];

                    itemsToProcess.forEach(item => {
                        let rawVaultName = (item.StorageVault || "Backpack").trim();
                        if (rawVaultName === "") rawVaultName = "Backpack";
                        
                        let cleanId = rawVaultName.toLowerCase();
                        if (cleanId.startsWith('npc_')) cleanId = cleanId.substring(4);
                        
                        const isShared = cleanId.includes('accountstorage') || cleanId.includes('transferchest');

                        if (showAllInventory && isShared) {
                            if (!sharedVaultOwners.has(cleanId)) {
                                sharedVaultOwners.set(cleanId, item._owner);
                            }
                            if (sharedVaultOwners.get(cleanId) !== item._owner) {
                                return; 
                            }
                        }

                        if (isShared) {
                            storageCounts.shared++;
                        } else if (item._owner === selectedCharId) {
                            storageCounts.used++;
                        }

                        const stackVal = (item.Value || 0) * (item.StackSize || 1);
                        if (item._owner === selectedCharId) {
                            invValue += stackVal;
                        }

                        if (!storageUsage[rawVaultName]) {
                            storageUsage[rawVaultName] = { count: 0, max: 0, zone: 'Unknown', owner: item._owner };
                            const vData = vaultMap[rawVaultName];
                            if (vData) {
                                if (vData.NpcFriendlyName) {
                                    const npc = npcs.find(n => n.name === vData.NpcFriendlyName);
                                    if (npc && npc.data.AreaName) storageUsage[rawVaultName].zone = npc.data.AreaName.replace('Area_', '');
                                }
                                
                                if (vData.NumSlots > 0) {
                                    storageUsage[rawVaultName].max = vData.NumSlots;
                                } 
                                else if (vData.Levels) {
                                    if (currentCharData && currentCharData.data.NpcFavor) {
                                        const npcName = vData.NpcFriendlyName;
                                        const favorPoints = currentCharData.data.NpcFavor[npcName] || 0;
                                        let level = "Neutral";
                                        if (favorPoints >= 6000) level = "SoulMates";
                                        else if (favorPoints >= 5000) level = "LikeFamily";
                                        else if (favorPoints >= 4000) level = "BestFriends";
                                        else if (favorPoints >= 3000) level = "CloseFriends";
                                        else if (favorPoints >= 2000) level = "Friends";
                                        else if (favorPoints >= 1000) level = "Comfortable";
                                        
                                        if (vData.Levels[level]) {
                                             storageUsage[rawVaultName].max = typeof vData.Levels[level] === 'object' ? vData.Levels[level].Slots : vData.Levels[level];
                                        } else {
                                            const levels = ["Neutral", "Comfortable", "Friends", "CloseFriends", "BestFriends", "LikeFamily", "SoulMates"];
                                            let found = 0;
                                            for (const l of levels) {
                                                if (vData.Levels[l]) found = typeof vData.Levels[l] === 'object' ? vData.Levels[l].Slots : vData.Levels[l];
                                                if (l === level) break;
                                            }
                                            storageUsage[rawVaultName].max = found;
                                        }
                                    }

                                    if (storageUsage[rawVaultName].max === 0) {
                                        let absoluteMax = 0;
                                        Object.values(vData.Levels).forEach(val => {
                                            const s = typeof val === 'object' ? val.Slots : val;
                                            if (s > absoluteMax) absoluteMax = s;
                                        });
                                        storageUsage[rawVaultName].max = absoluteMax;
                                    }
                                }
                            } else {
                                if (rawVaultName.startsWith("AccountStorage_")) {
                                    storageUsage[rawVaultName].zone = rawVaultName.replace("AccountStorage_", "");
                                }
                            }
                        }
                        storageUsage[rawVaultName].count++;

                        let isLearnable = false;
                        const meta = itemMetaMap[item.TypeID];
                        if (meta && meta.recipes) {
                            isLearnable = meta.recipes.some(r => !knownRecipes.has(r));
                        }

                        let displayLoc = rawVaultName.replace(/^NPC_/, '');
                        if (showAllInventory) {
                            if (isShared) {
                                displayLoc = `${displayLoc} (Shared)`;
                            } else if (item._owner) {
                                displayLoc = `${displayLoc} (${item._owner})`;
                            }
                        }

                        processedItems.push({
                            ...item,
                            icon: meta ? meta.icon : null,
                            totalValue: stackVal,
                            isLearnable: isLearnable,
                            displayLoc: displayLoc || "Unknown",
                            rawVault: rawVaultName
                        });
                    });
                    
                    if (currentCharData) {
                        const gold = currentCharData.data.Currencies.GOLD || currentCharData.data.Currencies.Gold || 0;
                        setNetWorth(gold + invValue);
                    }
                    
                    setInventory(processedItems);
                    setStorageMeta(storageUsage);
                    setEncumbrance(storageCounts);
                } else {
                    setInventory([]);
                    setNetWorth(0);
                    setStorageMeta({});
                    setEncumbrance({ used: 0, shared: 0 });
                }

                // --- Quest Processing ---
                if (currentCharData && currentCharData.data.ActiveQuests) {
                    const allQuests = await db.objects.where('type').equals('quests').toArray();
                    const npcs = await db.objects.where('type').equals('npcs').toArray();
                    
                    const npcToArea = {};
                    npcs.forEach(n => {
                        const area = n.data.AreaName || n.data.AreaId;
                        if (area) {
                            if (n.id) npcToArea[n.id] = area;
                            if (n.data.InternalName) npcToArea[n.data.InternalName] = area;
                            if (n.name) npcToArea[n.name] = area;
                        }
                    });

                    const questToZone = {};
                    allQuests.forEach(q => {
                        let z = q.data.Area || q.data.Zone;
                        if (!z && q.data.Giver) {
                            z = npcToArea[q.data.Giver];
                        }
                        if (z) questToZone[q.name] = z;
                    });

                    const zoneCounts = {};
                    currentCharData.data.ActiveQuests.forEach(qName => {
                        let rawZone = questToZone[qName] || "Unknown";
                        let cleanZone = rawZone.replace(/^Area_/i, '').replace(/([A-Z])/g, ' $1').trim();
                        if (cleanZone === 'Serbule2') cleanZone = 'Serbule Hills'; 
                        zoneCounts[cleanZone] = (zoneCounts[cleanZone] || 0) + 1;
                    });
                    setQuestStats(zoneCounts);
                } else {
                    setQuestStats({});
                }

                // --- Vendor Data Loading ---
                if (currentCharData && selectedCharId) {
                    const vendorEntries = await db.objects.where('type').equals('vendors').toArray();
                    const charVendors = vendorEntries.filter(e => e.refs && e.refs.includes(`character:${selectedCharId}`));
                    
                    const npcFavor = currentCharData.data.NpcFavor || {};
                    const npcMap = new Map();
                    
                    // Add NPCs from vendor logs
                    charVendors.forEach(v => {
                        const npcName = v.data.npc || v.name;
                        // Clean display name by removing NPC_ prefix
                        const displayName = npcName.startsWith('NPC_') ? npcName.replace('NPC_', '') : npcName;
                        if (!npcMap.has(npcName)) {
                            npcMap.set(npcName, {
                                id: v.id,
                                name: displayName,
                                npc: v.data.npc,
                                data: v.data,
                                currentFavor: npcFavor[displayName] || npcFavor[npcName] || 0,
                                storageVault: null,
                                hasVendorLog: true
                            });
                        }
                    });
                    
                    // Add NPCs from storage vaults (even if no vendor log)
                    Object.entries(storageUsage).forEach(([vaultKey, vaultData]) => {
                        if (vaultKey.startsWith('NPC_')) {
                            // vaultKey is like "NPC_Ragabir" which matches the npc name from vendor logs
                            const vData = vaultMap[vaultKey];
                            const friendlyName = vData?.NpcFriendlyName;
                            
                            // Check if we already have this NPC from vendor logs
                            // The vendor log uses the full "NPC_X" format, so check vaultKey directly
                            const existingEntry = npcMap.get(vaultKey) || (friendlyName && npcMap.get(friendlyName));
                            
                            if (existingEntry) {
                                // Update existing entry with storage data
                                existingEntry.storageVault = vaultData;
                            } else {
                                // Create entry for NPCs we have storage for but no vendor log
                                const displayName = friendlyName || vaultKey.replace('NPC_', '');
                                npcMap.set(vaultKey, {
                                    id: `storage_${vaultKey}`,
                                    name: displayName,
                                    npc: vaultKey,
                                    data: {
                                        npc: vaultKey,
                                        favorLabel: 'Unknown',
                                        balance: 0,
                                        resetTimer: 0,
                                        maxBalance: 0
                                    },
                                    currentFavor: npcFavor[displayName] || npcFavor[vaultKey] || 0,
                                    storageVault: vaultData,
                                    hasVendorLog: false
                                });
                            }
                        }
                    });
                    
                    setVendorData(Array.from(npcMap.values()));
                } else {
                    setVendorData([]);
                }

            } catch (err) {
                console.error("Error loading char data", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedCharId, showAllInventory, availableChars]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedInventory = useMemo(() => {
        let sortableItems = [...inventory];
        if (storageFilter) {
            sortableItems = sortableItems.filter(i => i.rawVault === storageFilter);
        }
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let valA = sortConfig.key === 'displayLoc' ? a.displayLoc : a[sortConfig.key];
                let valB = sortConfig.key === 'displayLoc' ? b.displayLoc : b[sortConfig.key];
                
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems.filter(i => i.Name.toLowerCase().includes(filter.toLowerCase()));
    }, [inventory, sortConfig, filter, storageFilter]);

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Icon name="loader-2" className="w-8 h-8 animate-spin" /></div>;
    if (availableChars.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="text-lg font-semibold mb-3">No Characters Found...</div>
            <div className="text-sm text-slate-500 mb-6">You haven't imported any character data yet.</div>
            <button
                onClick={() => { if (typeof goToIngest === 'function') goToIngest(); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
            >
                Import your VIP Storage and Character JSON
            </button>
        </div>
    );

    const formatCurrency = (key) => {
        if (!key) return key;
        const norm = key.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const map = {
            'GOLD': 'Gold',
            'REDWINGTOKENS': 'Red Wing Tokens',
            'RED_WING_TOKENS': 'Red Wing Tokens',
            'WARDEN': 'Warden',
            'LEC': 'LEC',
            'COMBATWISDOM': 'Combat Wisdom',
            'COMBAT_WISDOM': 'Combat Wisdom',
            'VIDARIARENOWN': 'Vidaria Renown',
            'VIDARIA_RENOWN': 'Vidaria Renown',
                'GUILDCREDITS': 'Guild Credits',
                'DREVASBLESSING': "Dreva's Blessing",
                'DREVA_S_BLESSING': "Dreva's Blessing",
                'DRUIDCREDITS': "Dreva's Blessing",
                'DRUID_CREDITS': "Dreva's Blessing",
                'WARDENPOINTS': 'Warden',
                'WARDEN_POINTS': 'Warden',
                'LIVEEVENTCREDITS': 'LEC',
                'LIVE_EVENT_CREDITS': 'LEC',
            'FAEENERGY': 'Fae Energy',
            'FAE_ENERGY': 'Fae Energy',
            'GLAMOUR': 'Glamour',
            'BLOODOATHS': 'Blood Oaths',
            'BLOOD_OATHS': 'Blood Oaths',
            'STATEHELMRENOWN': 'Statehelm Renown',
            'STATEHELM_RENOWN': 'Statehelm Renown'
        };
        if (map[norm]) return map[norm];
        // fallback to previous behavior: prettify key
        return key.replace(/([A-Z]+)/g, (match) => match.charAt(0) + match.slice(1).toLowerCase()).replace(/_/g, ' ');
    };

    const storageByZone = {};
    const cleanZoneName = (name) => {
        if (!name || name === 'Unknown') return "Special Storage";
        let cleaned = name.replace(/^Area_?/i, '');
        if (cleaned === 'Serbule2') return 'Serbule Hills';
        cleaned = cleaned.replace(/([A-Z])/g, ' $1').trim();
        return cleaned;
    };

    Object.entries(storageMeta).forEach(([key, data]) => {
        const zone = cleanZoneName(data.zone);
        if (!storageByZone[zone]) storageByZone[zone] = [];
        storageByZone[zone].push({ id: key, ...data });
    });

    return (
        <div className="p-4 md:p-8 pb-4 md:pb-0 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-light text-white">My Character:</h2>
                    <select 
                        value={selectedCharId} 
                        onChange={(e) => setSelectedCharId(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                        {availableChars.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex bg-slate-800 rounded p-1 gap-1 self-start md:self-auto">
                    <button onClick={()=>setActiveTab('stats')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab==='stats'?'bg-indigo-600 text-white':'text-slate-400'}`}>Stats</button>
                    <button onClick={()=>setActiveTab('skills')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab==='skills'?'bg-indigo-600 text-white':'text-slate-400'}`}>Skills</button>
                    <button onClick={()=>setActiveTab('npcs')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab==='npcs'?'bg-indigo-600 text-white':'text-slate-400'}`}>NPCs</button>
                    <button onClick={()=>setActiveTab('inventory')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab==='inventory'?'bg-indigo-600 text-white':'text-slate-400'}`}>Inventory</button>
                </div>
            </div>

            {activeTab === 'stats' && charData && (
                <div className="space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                            <div className="text-xs uppercase text-slate-500 mb-2 font-bold">Currencies</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div className="col-span-2 flex justify-between text-sm pb-2 mb-2 border-b border-slate-700/50">
                                    <span className="text-emerald-400 font-bold">Net Worth</span>
                                    <span className="text-white font-bold">{netWorth.toLocaleString()}</span>
                                </div>
                                {Object.entries(charData.Currencies).map(([key, val]) => (
                                    <div key={key} className="flex justify-between text-sm">
                                        <span className="text-slate-400">{formatCurrency(key)}</span>
                                        <span className="text-slate-200">{val.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700 h-fit">
                            <div className="text-xs uppercase text-slate-500 mb-2 font-bold">Vitals</div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm"><span className="text-red-400">Health</span> <span>{charData.CurrentStats.MAX_HEALTH}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-blue-400">Power</span> <span>{charData.CurrentStats.MAX_POWER}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-slate-300">Armor</span> <span>{charData.CurrentStats.MAX_ARMOR}</span></div>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700 h-fit">
                            <div className="text-xs uppercase text-slate-500 mb-2 font-bold">Encumbrance</div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm"><span className="text-slate-300">Used</span> <span>{encumbrance.used}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-indigo-300">Shared Storage</span> <span>{encumbrance.shared}</span></div>
                            </div>
                            <div className="mt-3 border-t border-slate-700/50 pt-3">
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-2">Data Management</div>
                                <button 
                                    onClick={() => { if (typeof goToIngest === 'function') goToIngest(); }}
                                    className="w-full px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500 mb-2"
                                >
                                    Import Game Data
                                </button>
                                <button 
                                    onClick={handlePurgeVendorLogs}
                                    className={`block w-full text-center text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                        confirmPurgeVendors 
                                            ? 'text-white bg-red-600 py-1 px-2 rounded' 
                                            : 'text-red-500 hover:text-red-400 hover:underline'
                                    }`}
                                >
                                    {confirmPurgeVendors ? "CONFIRM PURGE?" : "PURGE VENDOR LOGS"}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-xs uppercase text-slate-500 font-bold">Total Active Quests</div>
                            <div className="text-xl font-bold text-white">{charData.ActiveQuests ? charData.ActiveQuests.length : 0}</div>
                        </div>
                        
                        <div className="border-t border-slate-700/50 pt-2">
                            <button 
                                onClick={() => setShowQuestList(!showQuestList)}
                                className="w-full flex justify-between items-center text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider py-2"
                            >
                                <span>Details</span>
                                <Icon name={showQuestList ? "chevron-up" : "chevron-down"} className="w-4 h-4" />
                            </button>
                            
                            {showQuestList && (
                                <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                                    {charData.ActiveQuests && charData.ActiveQuests.map(q => {
                                        const words = splitNameToWords(q);
                                        const display = words.join(' ');
                                        return (
                                            <a
                                                key={q}
                                                href={wikiSearchUrlFor(q)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300 border border-slate-800 hover:bg-slate-800/70 hover:underline"
                                            >
                                                {display}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'skills' && (
                <div className="overflow-y-auto h-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {skills.map(s => {
                            let xpProgress = 0;
                            let abilityProgress = 0;
                            const isMax = s.xpNext <= 0;
                            
                            if (!isMax) {
                                xpProgress = (s.xpCurrent / s.xpNext) * 100;
                            } else {
                                xpProgress = 100;
                            }
                            
                            if (s.abilitiesAvailable > 0) {
                                abilityProgress = (s.abilitiesLearned / s.abilitiesAvailable) * 100;
                            }

                            return (
                                <div 
                                    key={s.name} 
                                    onClick={() => s.id && onNavigate('skills', s.id)}
                                    className={`relative h-16 rounded overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] flex 
                                        ${isMax 
                                            ? 'border-2 border-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.15)] bg-slate-800/90' 
                                            : 'border border-slate-700 hover:border-indigo-500 bg-slate-800/50'}`}
                                >
                                    <div className="flex-1 relative border-r border-slate-700/50">
                                        <div 
                                            className={`absolute top-0 left-0 h-full transition-all duration-500 ${isMax ? 'bg-amber-500/20' : 'bg-indigo-600/60'}`} 
                                            style={{ width: `${xpProgress}%` }} 
                                        />
                                        
                                        <div className="relative z-10 flex items-center gap-3 p-2 h-full">
                                            <div className="shrink-0">
                                                <GameIcon iconId={s.icon} size="w-10 h-10" className={`shadow-sm ${isMax ? 'ring-1 ring-amber-400/50 rounded' : ''}`} />
                                            </div>
                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                <div className="flex justify-between items-baseline">
                                                    <div className={`text-sm font-bold truncate pr-2 ${isMax ? 'text-amber-100' : 'text-white'}`}>{s.name}</div>
                                                    <div className={`text-xs font-bold ${isMax ? 'text-amber-400' : 'text-indigo-200'}`}>Lvl {s.level}</div>
                                                </div>
                                                <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                                                    {!isMax ? (
                                                        <span className="opacity-80">{s.xpCurrent.toLocaleString()} / {s.xpNext.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-amber-300 font-bold tracking-wider text-[9px]">MAX LEVEL</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-10 bg-slate-900/50 flex flex-col justify-end items-center relative">
                                        <div 
                                            className="absolute bottom-0 left-0 w-full bg-emerald-500/40 transition-all duration-500"
                                            style={{ height: `${abilityProgress}%` }}
                                        />
                                        {s.abilitiesAvailable > 0 && (
                                            <div className="relative z-10 text-[9px] font-mono text-emerald-200 font-bold mb-1 text-center leading-tight">
                                                <div>{s.abilitiesLearned}</div>
                                                <div className="border-t border-emerald-500/30 w-full"></div>
                                                <div>{s.abilitiesAvailable}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'npcs' && (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="text-lg font-light text-white">Character NPCs & Vendors</h3>
                        <button 
                            onClick={() => setHideNoStorage(!hideNoStorage)}
                            className={`px-3 py-1 rounded border text-xs font-bold flex items-center gap-2 transition-colors ${hideNoStorage ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            {hideNoStorage ? <Icon name="check-square" className="w-4 h-4" /> : <Icon name="square" className="w-4 h-4" />}
                            Storage Only
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto h-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vendorData
                                .filter(v => !hideNoStorage || v.storageVault)
                                .map(vendor => {
                                    const soulMatesFavor = 6000;
                                    const favorProgress = (vendor.currentFavor / soulMatesFavor) * 100;
                                    const hasStorage = !!vendor.storageVault;
                                    
                                    // Calculate time until reset - resetTimer is in seconds (UTC timestamp)
                                    const now = Math.floor(Date.now() / 1000); // Current time in seconds
                                    const timeUntilReset = Math.max(0, vendor.data.resetTimer - now);
                                    const hoursUntilReset = Math.floor(timeUntilReset / 3600);
                                    const minutesUntilReset = Math.floor((timeUntilReset % 3600) / 60);
                                    
                                    // Favor level coloring
                                    let favorColor = 'bg-slate-600';
                                    if (vendor.currentFavor >= 6000) favorColor = 'bg-pink-500';
                                    else if (vendor.currentFavor >= 5000) favorColor = 'bg-purple-500';
                                    else if (vendor.currentFavor >= 4000) favorColor = 'bg-blue-500';
                                    else if (vendor.currentFavor >= 3000) favorColor = 'bg-green-500';
                                    else if (vendor.currentFavor >= 2000) favorColor = 'bg-emerald-500';
                                    else if (vendor.currentFavor >= 1000) favorColor = 'bg-yellow-500';
                                    
                                    return (
                                        <div key={vendor.id} className="bg-slate-800/50 border border-slate-700 rounded p-4 hover:border-indigo-500 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <button 
                                                        onClick={() => onNavigate('npcs', vendor.data.npc || vendor.name)}
                                                        className="text-sm font-bold text-white hover:text-indigo-400 hover:underline text-left"
                                                    >
                                                        {vendor.name}
                                                    </button>
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mt-0.5">
                                                        {vendor.data.favorLabel || 'Vendor'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Favor Bar */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                                    <span className="font-bold uppercase tracking-wider">Favor to Soul Mates</span>
                                                    <span className="font-mono">{vendor.currentFavor} / {soulMatesFavor}</span>
                                                </div>
                                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${favorColor} transition-all duration-500`}
                                                        style={{ width: `${Math.min(100, favorProgress)}%` }}
                                                    />
                                                </div>
                                                <div className="text-right text-[9px] text-slate-500 mt-0.5 font-bold">
                                                    {Math.round(favorProgress)}%
                                                </div>
                                            </div>
                                            
                                            {/* Vendor Info */}
                                            <div className="space-y-2 mb-3">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Balance</span>
                                                    <span className="text-emerald-400 font-mono font-bold">
                                                        {vendor.data.balance?.toLocaleString() || 0}
                                                        {vendor.data.maxBalance > 0 && (
                                                            <span className="text-slate-500 text-[10px] ml-1">/ {vendor.data.maxBalance.toLocaleString()}</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Restock Timer</span>
                                                    <span className={`font-mono font-bold ${
                                                        timeUntilReset <= 0 ? 'text-green-400' : 
                                                        timeUntilReset < 3600 ? 'text-yellow-400' : 
                                                        'text-amber-400'
                                                    }`}>
                                                        {timeUntilReset > 0 ? `${hoursUntilReset}h ${minutesUntilReset}m` : 'Ready!'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Storage Bar (if exists) */}
                                            {hasStorage && (
                                                <div className="pt-3 border-t border-slate-700/50">
                                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                                        <span className="font-bold uppercase tracking-wider">Storage</span>
                                                        <span className="font-mono">{vendor.storageVault.count} / {vendor.storageVault.max}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${
                                                                (vendor.storageVault.count / vendor.storageVault.max) > 0.9 ? 'bg-red-500' : 
                                                                (vendor.storageVault.count / vendor.storageVault.max) > 0.75 ? 'bg-amber-500' : 
                                                                'bg-indigo-600'
                                                            }`}
                                                            style={{ width: `${Math.min(100, (vendor.storageVault.count / vendor.storageVault.max) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                        
                        {vendorData.filter(v => !hideNoStorage || v.storageVault).length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                <Icon name="users" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <div className="text-sm">No vendor data found.</div>
                                <div className="text-xs mt-1">Import player logs from the Stats tab to see NPC data.</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="flex flex-col h-full">
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="Filter items..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded p-2 text-sm flex-1"
                        />
                        <button 
                            onClick={() => setShowAllInventory(!showAllInventory)}
                            className={`px-3 rounded border text-xs font-bold flex items-center gap-2 transition-colors ${showAllInventory ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            {showAllInventory ? <Icon name="check-square" className="w-4 h-4" /> : <Icon name="square" className="w-4 h-4" />}
                            ALL
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-500 text-xs uppercase bg-slate-900 sticky top-0 z-10">
                                <tr>
                                    <th className="p-2 cursor-pointer hover:text-white" onClick={() => handleSort('Name')}>
                                        Item {sortConfig.key === 'Name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-2 cursor-pointer hover:text-white" onClick={() => handleSort('displayLoc')}>
                                        Loc {sortConfig.key === 'displayLoc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('StackSize')}>
                                        Qty {sortConfig.key === 'StackSize' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalValue')}>
                                        Cost {sortConfig.key === 'totalValue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {sortedInventory.map((item, i) => {
                                    const isNpc = (item.StorageVault || "").startsWith('NPC_');
                                    const rawLocName = isNpc ? item.StorageVault.replace('NPC_', '') : item.StorageVault;
                                    const finalLocName = (item.displayLoc || "").replace('NPC_', '');
                                    
                                    return (
                                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-2 flex items-center gap-2">
                                                <button onClick={() => onNavigate('items', item.TypeID)} className="shrink-0 hover:opacity-80">
                                                    <GameIcon iconId={item.icon} size="w-6 h-6" />
                                                </button>
                                                <div className="flex flex-col min-w-0">
                                                    <button 
                                                        onClick={() => onNavigate('items', item.TypeID)}
                                                        className={`text-left truncate hover:underline ${item.Rarity === 'Legendary' ? 'text-amber-400' : item.Rarity === 'Epic' ? 'text-purple-400' : item.Rarity === 'Rare' ? 'text-blue-400' : item.isLearnable ? 'text-red-500 font-bold' : 'text-slate-300'}`}
                                                    >
                                                        {item.Name}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-2 text-xs text-slate-500">
                                                {isNpc ? (
                                                    <button onClick={() => onNavigate('npcs', rawLocName)} className="hover:text-indigo-400 hover:underline">
                                                        {finalLocName}
                                                    </button>
                                                ) : (
                                                    finalLocName
                                                )}
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-400">{item.StackSize}</td>
                                            <td className="p-2 text-right font-mono text-emerald-400 text-xs">
                                                {item.Value ? `${item.Value.toLocaleString()} (${(item.Value * item.StackSize).toLocaleString()})` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCharacterView;
