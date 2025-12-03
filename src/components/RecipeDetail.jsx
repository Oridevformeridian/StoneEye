import React, { useState, useEffect } from 'react';
import StatBox from './StatBox';
import Icon from './Icon';
import GameIcon from './GameIcon';
import { db } from '../db'; // Import db from the new module
import ReferenceList from './ReferenceList';

const RecipeDetail = ({ data, onNavigate, referencedBy }) => {
    const [itemNames, setItemNames] = useState({});
    useEffect(() => {
        const fetchNames = async () => {
            const idsToLoad = new Set();
            if (data.Ingredients) data.Ingredients.forEach(ing => ing.ItemCode && idsToLoad.add(ing.ItemCode));
            const allResults = [...(data.ResultItems || []), ...(data.ProtoResultItems || [])];
            allResults.forEach(res => res.ItemCode && idsToLoad.add(res.ItemCode));
            if (idsToLoad.size === 0) { setItemNames({}); return; }
            const newNames = {};
            await Promise.all(Array.from(idsToLoad).map(async (id) => {
                const item = await db.objects.get({ type: 'items', id: id });
                if (item) newNames[id] = { name: item.name, iconId: item.data.IconId || item.data.IconID };
            }));
            setItemNames(newNames);
        };
        fetchNames();
    }, [data]);

    const renderResults = (list) => (
        <ul className="space-y-2">
            {(list || []).map((res, i) => {
                const itemInfo = itemNames[res.ItemCode];
                return (
                    <li key={i} className="flex justify-between items-center text-sm p-2 bg-slate-900/30 rounded">
                        {res.ItemCode ? (
                            <button onClick={() => onNavigate('items', res.ItemCode)} className="flex items-center gap-2 text-slate-300 hover:text-indigo-400 hover:underline text-left">
                                <GameIcon iconId={itemInfo?.iconId} size="w-6 h-6" />
                                {itemInfo?.name || `Item ${res.ItemCode}`}
                            </button>
                        ) : <span className="text-slate-300">Unknown</span>}
                        <span className="font-mono text-indigo-400">x{res.StackSize}</span>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Skill" value={data.Skill || "None"} onClick={data.Skill ? () => onNavigate('skills', data.Skill) : undefined} />
                <StatBox label="Level" value={data.SkillLevelReq || 0} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                    <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2"><Icon name="package-plus" className="w-4 h-4" /> Ingredients</h4>
                    <ul className="space-y-2">
                        {(data.Ingredients || []).map((ing, i) => {
                            const itemInfo = itemNames[ing.ItemCode];
                            return (
                                <li key={i} className="flex justify-between items-center text-sm p-2 bg-slate-900/30 rounded">
                                    {ing.ItemCode ? (
                                        <button onClick={() => onNavigate('items', ing.ItemCode)} className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 hover:underline text-left">
                                            <GameIcon iconId={itemInfo?.iconId} size="w-6 h-6" />
                                            {itemInfo?.name || `Item ${ing.ItemCode}`}
                                        </button>
                                    ) : <span className="text-slate-300">{`Any ${ing.Keyword}`}</span>}
                                    <span className="font-mono text-emerald-400">x{ing.StackSize}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                    <h4 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><Icon name="gift" className="w-4 h-4" /> Results</h4>
                    {renderResults(data.ResultItems)}
                    {data.ProtoResultItems && <div className="mt-4 pt-4 border-t border-slate-700/50"><div className="text-xs font-bold text-slate-500 mb-2">Enchanted</div>{renderResults(data.ProtoResultItems)}</div>}
                </div>
            </div>
            <ReferenceList title="Referenced By" refs={referencedBy} onNavigate={onNavigate} />
        </div>
    );
};

export default RecipeDetail;
