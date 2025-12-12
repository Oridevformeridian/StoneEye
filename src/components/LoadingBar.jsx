
import React from 'react';
import PropTypes from 'prop-types';

const LoadingBar = ({ progress, status, subStatus }) => (
    <div className="w-full max-w-md mx-auto mt-4 px-4">
        <div className="flex justify-between text-xs mb-1 text-slate-400">
            <span>{status}</span>
            <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="text-center text-xs text-slate-500 truncate">{subStatus}</div>
    </div>
);


LoadingBar.propTypes = {
    progress: PropTypes.number.isRequired,
    status: PropTypes.string,
    subStatus: PropTypes.string,
};

export default LoadingBar;
