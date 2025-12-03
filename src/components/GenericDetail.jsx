import React from 'react';
import StatBox from './StatBox';
import ReferenceList from './ReferenceList';

const GenericDetail = ({ data, referencedBy, onNavigate }) => (
    <div className="space-y-6 pb-4 md:pb-0">
        <div className="bg-slate-800/40 rounded p-4 border border-slate-700/50">
            <div className="grid grid-cols-2 gap-3">
                {Object.entries(data).slice(0, 8).map(([k, v]) => {
                    if (typeof v !== 'object' && !k.includes('Desc') && !k.includes('Name') && !k.includes('Tiers')) return <StatBox key={k} label={k} value={v} />;
                    return null;
                })}
            </div>
        </div>
        <ReferenceList title="Referenced By" refs={referencedBy} onNavigate={onNavigate} />
    </div>
);

export default GenericDetail;
