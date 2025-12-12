
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import StatBox from './StatBox';
import Icon from './Icon';
import GameIcon from './GameIcon';
import Badge from './Badge';
import { db } from '../db'; // Import db from the new module
import { validateItem } from '../validation/validate';
import ReferenceList from './ReferenceList';

const AbilityDetail = ({ data, onNavigate, referencedBy }) => {
    const [ammoItems, setAmmoItems] = useState([]);
    const [reagentNames, setReagentNames] = useState({});

    useEffect(() => {
        const fetchReagents = async () => {
            if (!data.ItemsConsumed) { setReagentNames({}); return; }
            const newNames = {};
            await Promise.all(data.ItemsConsumed.map(async (item) => {
                if (item.ItemCode) {
                    const obj = await db.objects.get({ type: 'items', id: item.ItemCode });
                    try {
                        if (obj) {
                            const validObj = validateItem(obj);
                            newNames[item.ItemCode] = { name: validObj.name, iconId: validObj.data.IconId || validObj.data.IconID };
                        }
                    } catch (e) {
                        // Optionally log or handle validation error
                        console.error('Invalid item data:', e, obj);
                    }
                }
            }));
            setReagentNames(newNames);
        };
        fetchReagents();
    }, [data]);

    useEffect(() => {
        const fetchAmmo = async () => {
            if (!data.AmmoKeywords) { setAmmoItems([]); return; }
            const allAmmo = [];
            for (const k of data.AmmoKeywords) {
                const items = await db.objects.where('refs').equals(`keyword:${k.Keyword}`).toArray();
                items.forEach(item => allAmmo.push({ ...item, keyword: k.Keyword }));
            }
            setAmmoItems(allAmmo);
        };
        fetchAmmo();
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatBox label="Level" value={data.Level || 0} />
                <StatBox label="Power Cost" value={data.PvE?.PowerCost || data.PowerCost || 0} />
                <StatBox label="Range" value={data.PvE?.Range || data.Range || 0} />
                <StatBox label="Cooldown" value={`${data.ResetTime || 0}s`} />
                <StatBox label="Skill" value={data.Skill || "General"} onClick={data.Skill ? () => onNavigate('skills', data.Skill) : undefined} />
            </div>
            <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                <h4 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2"><Icon name="sword" className="w-4 h-4" /> Combat (PvE)</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span className="text-slate-400">Damage</span><span className="text-slate-200">{data.PvE?.Damage || 0}</span></div>
                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span className="text-slate-400">Type</span><span className="text-slate-200">{data.DamageType || "Phys"}</span></div>
                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span className="text-slate-400">Cast</span><span className="text-slate-200">{data.CastingTime || 0}s</span></div>
                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span className="text-slate-400">Rage</span><span className="text-slate-200">{data.PvE?.RageBoost || 0}</span></div>
                </div>
            </div>
            {data.ItemsConsumed && (
                <div className="bg-slate-800/30 p-4 rounded border border-slate-700/50">
                    <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2"><Icon name="flask-conical" className="w-4 h-4" /> Reagents</h4>
                    <ul className="space-y-2">
                        {data.ItemsConsumed.map((item, i) => {
                            const info = reagentNames[item.ItemCode];
                            return (
                                <li key={i} className="flex justify-between items-center text-sm p-2 bg-slate-900/30 rounded">
                                    <button onClick={() => onNavigate('items', item.ItemCode)} className="flex items-center gap-2 text-slate-300 hover:text-amber-400 hover:underline">
                                        <GameIcon iconId={info?.iconId} size="w-6 h-6" /> {info?.name || item.ItemCode}
                                    </button>
                                    <span className="font-mono text-amber-400">x{item.StackSize || 1}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            {data.Keywords && <div className="flex flex-wrap gap-1.5">{data.Keywords.map(k => <Badge key={k} color="amber">{k}</Badge>)}</div>}
            <ReferenceList title="Referenced By" refs={referencedBy} onNavigate={onNavigate} />
        </div>
    );
};


AbilityDetail.propTypes = {
    data: PropTypes.object.isRequired,
    onNavigate: PropTypes.func.isRequired,
    referencedBy: PropTypes.array,
};

export default AbilityDetail;
