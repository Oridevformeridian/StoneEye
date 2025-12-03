import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { db } from '../db';
import { FAVOR_LEVELS } from '../constants';

const NpcServicesView = ({ onNavigate }) => {
    const [npcData, setNpcData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const vaults = await db.objects.where('type').equals('storagevaults').toArray();
                const npcs = await db.objects.where('type').equals('npcs').toArray();
                const areas = await db.objects.where('type').equals('areas').toArray();

                const npcMap = {};
                npcs.forEach(npc => {
                    npcMap[npc.id] = npc;
                    if (npc.data.InternalName) npcMap[npc.data.InternalName] = npc;
                });

                const areaMap = {};
                areas.forEach(a => areaMap[a.id] = a.name);

                const cleanLocation = (loc) => {
                    if (!loc) return "Unknown";
                    let name = loc.replace(/^Area_?/i, '');
                    if (name === 'Serbule2') return 'Serbule Hills';
                    if (!name.includes(' ')) name = name.replace(/([A-Z])/g, ' $1').trim();
                    return name;
                };

                const storageRows = [];
                for (const vault of vaults) {
                    const d = vault.data;
                    let npcName = d.NpcFriendlyName;
                    if (d.Levels) {
                        let location = "Unknown";
                        let matchedNpc = null;
                        if (npcName) matchedNpc = npcs.find(n => n.name === npcName);
                        if (matchedNpc && matchedNpc.data.AreaName) location = matchedNpc.data.AreaName;
                        else if (matchedNpc && matchedNpc.data.AreaId) location = areaMap[matchedNpc.data.AreaId] || matchedNpc.data.AreaId;

                        const row = {
                            name: npcName || vault.name,
                            location: cleanLocation(location),
                            slots: {}
                        };

                        Object.entries(d.Levels).forEach(([favor, stats]) => {
                            let count = 0;
                            if (typeof stats === 'number') count = stats;
                            else if (stats.Slots) count = stats.Slots;
                            if (count > 0) row.slots[favor] = count;
                        });
                        storageRows.push(row);
                    }
                }
                storageRows.sort((a, b) => (a.location + a.name).localeCompare(b.location + b.name));
                setNpcData(storageRows);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Icon name="loader-2" className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="p-4 md:p-8 pb-4 md:pb-0 h-full overflow-hidden flex flex-col gap-8">
            <div className="flex flex-col h-full min-h-[300px]">
                 <div className="shrink-0 mb-4">
                    <h2 className="text-2xl font-light text-white mb-1">NPC Storage</h2>
                    <p className="text-slate-400 text-xs">Storage slots unlocked by favor.</p>
                </div>
                <div className="flex-1 overflow-auto border border-slate-700 rounded-xl bg-slate-900/50 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-800 text-slate-400 sticky top-0 z-20 shadow-md">
                            <tr>
                                <th className="p-3 font-semibold border-b border-slate-700 sticky-col bg-slate-800 min-w-[140px] z-30">NPC</th>
                                {FAVOR_LEVELS.map(level => (
                                    <th key={level} className="p-3 font-semibold border-b border-slate-700 min-w-[80px] text-center text-[10px] uppercase tracking-wider">{level.replace(/([A-Z])/g, ' $1').trim()}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {npcData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-3 font-medium text-slate-200 sticky-col bg-slate-950 group-hover:bg-slate-900 transition-colors border-r border-slate-800 z-10">
                                        <div className="text-white text-xs">{row.name}</div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                            <Icon name="map-pin" className="w-2.5 h-2.5" /> {row.location}
                                        </div>
                                    </td>
                                    {FAVOR_LEVELS.map(level => (
                                        <td key={level} className="p-3 text-center text-slate-400">
                                            {row.slots[level] ? (
                                                <span className="font-bold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded text-xs">{row.slots[level]}</span>
                                            ) : <span className="text-slate-800">-</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NpcServicesView;
