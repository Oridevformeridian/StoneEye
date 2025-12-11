import React from 'react';
import Icon from './Icon';

const LogMonitorStatus = ({ status, lastUpdate, stats }) => {
    if (status === 'inactive') return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
            <div className={`
                flex items-center gap-3 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all duration-300
                ${status === 'processing' 
                    ? 'bg-indigo-900/80 border-indigo-500 text-indigo-200' 
                    : 'bg-slate-900/80 border-slate-700 text-slate-300'}
            `}>
                <div className={`relative flex items-center justify-center w-2 h-2`}>
                    <div className={`absolute w-full h-full rounded-full ${status === 'processing' ? 'bg-indigo-400 animate-ping' : 'bg-green-500'}`}></div>
                    <div className={`relative w-2 h-2 rounded-full ${status === 'processing' ? 'bg-indigo-400' : 'bg-green-500'}`}></div>
                </div>
                
                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {status === 'processing' ? 'Processing Log...' : 'Live Monitor Active'}
                    </span>
                    {lastUpdate && (
                        <span className="text-[10px] opacity-70">
                            Last update: {lastUpdate.toLocaleTimeString()}
                        </span>
                    )}
                </div>

                {status === 'processing' && (
                    <Icon name="refresh-cw" className="w-4 h-4 animate-spin text-indigo-400" />
                )}
            </div>

            {stats.entries > 0 && (
                <div className="bg-slate-900/90 text-slate-400 text-[10px] px-3 py-1 rounded-full border border-slate-800 shadow-lg animate-fade-in-up">
                    Session: {stats.entries} entries, {stats.transactions} sales
                </div>
            )}
        </div>
    );
};

export default LogMonitorStatus;
