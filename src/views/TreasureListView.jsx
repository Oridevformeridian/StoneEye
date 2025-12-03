import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import GameIcon from '../components/GameIcon';
import { db } from '../db';

const TreasureListView = ({ onNavigate }) => {
    const [skillGroups, setSkillGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTreasures = async () => {
            setLoading(true);
            const allMods = await db.objects.where('type').equals('tsysclientinfo').toArray();

            const groups = {};
            allMods.forEach(mod => {
                if (mod.data.Skill) {
                    groups[mod.data.Skill] = (groups[mod.data.Skill] || 0) + 1;
                }
            });

            const processed = [];
            await Promise.all(Object.keys(groups).map(async (skillName) => {
                let icon = 5005;
                const skillObj = await db.objects.where('type').equals('skills').filter(s => s.name === skillName).first();
                if (skillObj && (skillObj.derivedIcon || skillObj.data.IconId)) {
                    icon = skillObj.derivedIcon || skillObj.data.IconId;
                } else {
                     const ability = await db.objects.where('type').equals('abilities').filter(a => a.data.Skill === skillName).first();
                     if (ability && ability.data.IconId) icon = ability.data.IconId;
                }

                processed.push({
                    name: skillName,
                    count: groups[skillName],
                    icon: icon
                });
            }));

            processed.sort((a, b) => a.name.localeCompare(b.name));
            setSkillGroups(processed);
            setLoading(false);
        };
        fetchTreasures();
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Icon name="loader-2" className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="p-4 md:p-8 pb-4 md:pb-0">
            <h2 className="text-2xl md:text-3xl font-light text-white mb-2">Treasure Mods</h2>
            <p className="text-slate-400 mb-6 text-sm">Equipment modifications by skill.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {skillGroups.map(group => (
                    <div key={group.name} onClick={() => onNavigate('tsysclientinfo', null, group.name)} className="bg-slate-800/50 hover:bg-slate-700 rounded-xl p-4 cursor-pointer border border-slate-700/50 hover:border-indigo-500 transition-all group shadow-sm flex flex-col items-center text-center gap-3">
                        <GameIcon iconId={group.icon} size="w-14 h-14" className="group-hover:scale-110 transition-transform shadow-md" />
                        <div>
                            <div className="font-bold text-slate-200 text-sm group-hover:text-white leading-tight">{group.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">{group.count} Mods</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TreasureListView;
