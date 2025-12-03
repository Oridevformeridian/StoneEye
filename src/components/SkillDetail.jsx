import React, { useState, useEffect } from 'react';
import StatBox from './StatBox';
import Icon from './Icon';
import GameIcon from './GameIcon';
import { db } from '../db';
import ReferenceList from './ReferenceList';

const SkillDetail = ({ data, onNavigate, referencedBy }) => {
    const [rewards, setRewards] = useState([]);
    const [filteredRefs, setFilteredRefs] = useState([]);
    const [skillAbilities, setSkillAbilities] = useState([]);
    const [skillRecipes, setSkillRecipes] = useState([]);

    useEffect(() => {
        const process = async () => {
            if (!data.Rewards) { setRewards([]); setFilteredRefs(referencedBy || []); return; }
            const levels = Object.keys(data.Rewards).sort((a, b) => parseInt(a) - parseInt(b));
            const processed = [];
            const idSet = new Set();

            const norm = (p, s) => {
                const l = [];
                if (p && Array.isArray(p)) l.push(...p);
                if (s) (Array.isArray(s) ? l.push(...s) : l.push(s));
                return l;
            };

            const lookupRequests = [];
            for (const lvl of levels) {
                const r = data.Rewards[lvl];
                const abs = norm(r.Abilities, r.Ability);
                abs.forEach(id => lookupRequests.push({ type: 'abilities', id }));
                const recs = norm(r.Recipes, r.Recipe);
                recs.forEach(id => lookupRequests.push({ type: 'recipes', id }));
            }

            const uniqueKeys = new Set(lookupRequests.map(r => `${r.type}:${r.id}`));
            const objectMap = new Map();
            await Promise.all(Array.from(uniqueKeys).map(async (key) => {
                const [type, rawId] = key.split(':');
                let qId = rawId;
                if (typeof rawId === 'string' && rawId.match(/^\d+$/)) qId = parseInt(rawId);
                let obj = await db.objects.get({ type, id: qId });
                if (!obj && typeof rawId === 'string') {
                     const matches = await db.objects.where('type').equals(type).filter(o => o.data.InternalName === rawId || o.name === rawId).toArray();
                     if (matches.length > 0) obj = matches[0];
                }
                if (obj) objectMap.set(key, obj);
            }));

            for (const lvl of levels) {
                const r = data.Rewards[lvl];
                const entries = [];
                const abs = norm(r.Abilities, r.Ability);
                for (const rid of abs) {
                    const key = `abilities:${rid}`;
                    const ab = objectMap.get(key);
                    const finalId = ab ? ab.id : rid;
                    idSet.add(`abilities:${finalId}`);
                    entries.push({ type: 'link', target: 'abilities', id: finalId, label: 'Unlock Ability', name: ab ? ab.name : rid, color: 'text-indigo-400', icon: ab?.data?.IconId || ab?.data?.IconID });
                }
                const recs = norm(r.Recipes, r.Recipe);
                for (const rid of recs) {
                    const key = `recipes:${rid}`;
                    const rc = objectMap.get(key);
                    const finalId = rc ? rc.id : rid;
                    idSet.add(`recipes:${finalId}`);
                    entries.push({ type: 'link', target: 'recipes', id: finalId, label: 'Unlock Recipe', name: rc ? rc.name : rid, color: 'text-emerald-400', icon: rc?.data?.IconId || rc?.data?.IconID });
                }
                if (r.Notes) entries.push({ type: 'text', text: r.Notes, color: 'text-slate-400' });
                const skip = ['Abilities', 'Ability', 'Recipes', 'Recipe', 'Notes'];
                Object.entries(r).forEach(([k, v]) => {
                    if (!skip.includes(k)) {
                        if (k === 'BonusToSkill') {
                            const txt = (typeof v === 'string') ? `+1 ${v}` : `+${v === true ? 1 : v} ${data.Name || 'Skill'}`;
                            entries.push({ type: 'text', text: txt, color: 'text-amber-300 font-bold' });
                        } else {
                            entries.push({ type: 'text', text: `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`, color: 'text-amber-200' });
                        }
                    }
                });
                if (entries.length > 0) processed.push({ level: lvl, entries });
            }
            setRewards(processed);
            if (referencedBy) {
                setFilteredRefs(referencedBy.filter(ref => !idSet.has(`${ref.type}:${ref.id}`)));
            }
        };
        process();
    }, [data, referencedBy]);

    useEffect(() => {
        if (!referencedBy) return;
        const abs = referencedBy.filter(r => r.type === 'abilities');
        const recs = referencedBy.filter(r => r.type === 'recipes');
        setSkillAbilities(abs);
        setSkillRecipes(recs);
    }, [data, referencedBy]);

    return (
        <div className="space-y-8 pb-4 md:pb-0">
            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Combat?" value={data.Combat ? "Yes" : "No"} />
                <StatBox label="Max Level" value={data.MaxLevel || 100} />
            </div>

            {rewards.length > 0 && (
                <div className="bg-slate-800/40 rounded border border-slate-700/50 overflow-hidden">
                    <div className="p-3 border-b border-slate-700/50 bg-slate-900/50">
                        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2"><Icon name="trending-up" className="w-4 h-4 text-indigo-400" /> Progression Rewards</h4>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {rewards.map(e => (
                            <div key={e.level} className="p-4 flex gap-4">
                                <div className="shrink-0 w-12 text-center">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Lvl</div>
                                    <div className="text-lg font-bold text-white">{e.level}</div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {e.entries.map((u, i) => u.type === 'link' ? (
                                        <button key={i} onClick={() => onNavigate(u.target, u.id)} className="group w-full bg-slate-900/60 p-2 rounded border border-slate-700/50 hover:border-indigo-500 flex items-center gap-3 text-left transition-all">
                                            <GameIcon iconId={u.icon} size="w-8 h-8" />
                                            <div className="min-w-0">
                                                <div className={`text-[10px] font-bold uppercase ${u.color}`}>{u.label}</div>
                                                <div className="text-sm text-slate-200 truncate">{u.name}</div>
                                            </div>
                                        </button>
                                    ) : (
                                        <div key={i} className={`text-sm ${u.color} pl-1`}>{u.text}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {skillAbilities.length > 0 && <ReferenceList title="All Abilities" refs={skillAbilities} onNavigate={onNavigate} />}
            {skillRecipes.length > 0 && <ReferenceList title="All Recipes" refs={skillRecipes} onNavigate={onNavigate} />}
            {filteredRefs.filter(r => r.type !== 'abilities' && r.type !== 'recipes').length > 0 && (
                 <ReferenceList title="Purchased / Found" refs={filteredRefs.filter(r => r.type !== 'abilities' && r.type !== 'recipes')} onNavigate={onNavigate} />
            )}
        </div>
    );
};

export default SkillDetail;
