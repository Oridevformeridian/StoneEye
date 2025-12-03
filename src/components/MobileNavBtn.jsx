import React from 'react';
import Icon from './Icon';

const MobileNavBtn = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        title={label}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-col items-center justify-center w-full h-full ${active ? 'text-indigo-400' : 'text-slate-500'}`}
    >
        <Icon name={icon} className={`w-6 h-6 mb-1 ${active ? 'animate-bounce' : ''}`} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default MobileNavBtn;
