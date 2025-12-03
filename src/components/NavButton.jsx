import React from 'react';
import Icon from './Icon';

const NavButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        title={label}
        aria-current={active ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
    >
        <Icon name={icon} className="w-5 h-5" /> {label}
    </button>
);

export default NavButton;
