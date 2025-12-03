import React from 'react';
import StatBox from './StatBox';
import { db } from '../db';

const TreasureDetail = ({ data, onNavigate }) => {
    const handleSkillClick = async () => {
        if (!data.Skill) return;
        const skills = await db.objects.where('type').equals('skills').filter(s => s.name === data.Skill).toArray();
        if (skills.length > 0) onNavigate('skills', skills[0].id);
    };

    return (
        <div className="space-y-6 pb-4 md:pb-0">
            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Slot" value={data.EquipSlot || "Unknown"} />
                 <StatBox
                    label="Skill"
                    value={data.Skill || "Unknown"}
                    onClick={(data.Skill && data.Skill !== 'Unknown' && data.Skill !== 'AnySkill') ? handleSkillClick : undefined}
                />
            </div>
            {data.Tiers && data.Tiers.length > 0 && (
                 <div className="bg-slate-800/30 rounded border border-slate-700/50 overflow-hidden">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        {data.Tiers.map((tier, i) => (
                            <div key={i} className="bg-slate-900/50 p-4 rounded border border-slate-700/50 flex flex-col">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700/30">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Tier {i + 1}</span>
                                    <span className="text-xs font-mono text-slate-400">Lvl {tier.SkillLevelPrereq}</span>
                                </div>
                                <div className="text-sm text-emerald-300 leading-snug">
                                    {tier.EffectDescs && tier.EffectDescs.map((d, idx) => (
                                        <div key={idx}>{d}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TreasureDetail;
