import React from 'react';
import GameIcon from './GameIcon';

const ResultRow = ({ obj, isSelected, onClick }) => {
    const icon = obj.data.IconId || obj.data.IconID || obj.derivedIcon || (obj.type === 'skills' ? 5005 : null);
    const level = obj.data.Level || obj.data.SkillLevelReq || null;

    return (
        <div onClick={() => onClick(obj)} className={`p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors flex gap-3 items-center ${isSelected ? 'bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''}`}>
            <GameIcon iconId={icon} size="w-10 h-10" />
            <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-200 truncate text-sm">{obj.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                    <span>{obj.category === 'active' || obj.category === 'trade' || obj.category === 'lore' ? 'Skill' : obj.type}</span>
                    {level && <span className="text-slate-400 font-mono">Lvl {level}</span>}
                </div>
            </div>
        </div>
    );
};

export default ResultRow;
