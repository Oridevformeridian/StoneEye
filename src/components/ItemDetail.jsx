import React from 'react';
import StatBox from './StatBox';
import Icon from './Icon';
import Badge from './Badge';
import ReferenceList from './ReferenceList';

const ItemDetail = ({ data, onNavigate, referencedBy }) => (
    <div className="space-y-6 pb-4 md:pb-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Value" value={`${data.Value || 0} Councils`} />
            <StatBox label="Stack Size" value={data.MaxStackSize || 1} />
            <StatBox label="Slot" value={data.EquipSlot || "None"} />
            <StatBox label="Type" value={Array.isArray(data.Keywords) ? data.Keywords[0]?.replace('ItemClass_', '') : 'Item'} />
        </div>

        {data.EffectDescs && data.EffectDescs.length > 0 && (
            <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50">
                <h4 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
                    <Icon name="sparkles" className="w-4 h-4" /> Effects
                </h4>
                <ul className="space-y-2">
                    {data.EffectDescs.map((eff, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2 leading-snug">
                            <span className="mt-1.5 w-1 h-1 bg-indigo-500 rounded-full shrink-0"></span>
                            {eff}
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {data.Keywords && (
            <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-1.5">
                    {data.Keywords.map(k => <Badge key={k}>{k}</Badge>)}
                </div>
            </div>
        )}

        <ReferenceList title="Referenced By" refs={referencedBy} onNavigate={onNavigate} />
    </div>
);

export default ItemDetail;
