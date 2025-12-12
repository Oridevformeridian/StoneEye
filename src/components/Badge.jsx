
import React from 'react';
import PropTypes from 'prop-types';

const Badge = ({ children, color = 'slate' }) => {
    const colors = {
        slate: 'bg-slate-800 text-slate-300 border-slate-700',
        indigo: 'bg-indigo-900/40 text-indigo-300 border-indigo-800',
        emerald: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
        amber: 'bg-amber-900/40 text-amber-300 border-amber-800',
        red: 'bg-red-900/40 text-red-300 border-red-800',
    };
    return (
        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${colors[color] || colors.slate}`}>
            {children}
        </span>
    );
};


Badge.propTypes = {
    children: PropTypes.node.isRequired,
    color: PropTypes.oneOf(['slate', 'indigo', 'emerald', 'amber', 'red']),
};

export default Badge;
