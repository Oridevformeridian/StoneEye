import React from 'react';
import Icon from './Icon';
import GameIcon from './GameIcon';

const ReferenceList = ({ title, refs, onNavigate }) => {
    if (!refs || refs.length === 0) return null;
    return (
        <div className="mt-8 pt-8 border-t border-slate-800">
            <h3 className="text-lg font-light text-white flex items-center gap-2 mb-4">
                <Icon name="link" className="w-5 h-5 text-indigo-400" />
                {title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {refs.map(ref => (
                    <div
                        key={`${ref.type}-${ref.id}`}
                        onClick={() => onNavigate(ref.type, ref.id)}
                        className="bg-slate-800/50 p-3 rounded border border-slate-700/50 active:bg-slate-700 hover:border-indigo-500 cursor-pointer transition-colors flex items-center gap-3"
                    >
                        <div className="shrink-0">
                            <GameIcon iconId={ref.data.IconId || ref.data.IconID} size="w-10 h-10" />
                        </div>
                        <div className="min-w-0 w-full">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase">{ref.type}</span>
                                {(ref.data.Level || ref.data.SkillLevelReq) && <span className="text-[10px] font-mono text-slate-500">Lvl {ref.data.Level || ref.data.SkillLevelReq}</span>}
                            </div>
                            <div className="text-slate-200 text-sm font-medium truncate">{ref.name}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReferenceList;
