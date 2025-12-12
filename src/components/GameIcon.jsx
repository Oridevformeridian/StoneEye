
import React from 'react';
import PropTypes from 'prop-types';

const GameIcon = ({ iconId, size = "w-8 h-8", className = "" }) => {
    if (!iconId) return null;
    return (
        <div className={`${size} bg-slate-800 rounded border border-slate-700 shrink-0 overflow-hidden ${className}`}>
            <img
                src={`https://cdn.projectgorgon.com/v439/icons/icon_${iconId}.png`}
                onError={(e) => {e.target.style.display='none'}}
                className="w-full h-full object-cover"
                alt=""
            />
        </div>
    );
};


GameIcon.propTypes = {
    iconId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    size: PropTypes.string,
    className: PropTypes.string,
};

export default GameIcon;
