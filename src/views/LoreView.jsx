import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import GameIcon from '../components/GameIcon';
import { db } from '../db';

const LoreView = ({ onNavigate }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLore = async () => {
            setLoading(true);
            const allSkills = await db.objects.where('[type+category]').equals(['skills', 'lore']).toArray();
            setItems(allSkills.sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        };
        fetchLore();
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Icon name="loader-2" className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="p-4 md:p-8 pb-4 md:pb-0">
            <h2 className="text-2xl md:text-3xl font-light text-white mb-2">Lore & More</h2>
            <p className="text-slate-400 mb-6 text-sm">Passive skills, knowledge, and miscellaneous.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {items.map(skill => (
                    <div key={skill.id} onClick={() => onNavigate('skills', skill.id)} className="bg-slate-800/50 hover:bg-slate-700 rounded-xl p-4 cursor-pointer border border-slate-700/50 hover:border-indigo-500 transition-all group shadow-sm flex flex-col items-center text-center gap-3">
                        <GameIcon iconId={skill.derivedIcon} size="w-14 h-14" className="group-hover:scale-110 transition-transform shadow-md" />
                        <div>
                            <div className="font-bold text-slate-200 text-sm group-hover:text-white leading-tight">{skill.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Max Lvl {skill.data.MaxLevel || 100}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LoreView;
