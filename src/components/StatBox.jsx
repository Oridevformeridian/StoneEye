import React from 'react';

const StatBox = ({ label, value, onClick }) => (
    <div className="bg-slate-800/40 p-3 rounded border border-slate-700/50">
        <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</div>
        {onClick ? (
            <button onClick={onClick} className="text-indigo-400 hover:text-indigo-300 font-medium text-left text-sm truncate w-full">
                {value}
            </button>
        ) : (
            <div className="text-slate-200 font-medium text-sm truncate">{value}</div>
        )}
    </div>
);

export default StatBox;
