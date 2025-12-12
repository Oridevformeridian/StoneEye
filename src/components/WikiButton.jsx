import React from 'react';
import Icon from './Icon';

const WikiButton = ({ type, name }) => {
    const getUrl = () => {
        if (!name) return 'https://wiki.projectgorgon.com/wiki/Main_Page';
        const cleanName = name.replace(/ /g, '_');
        const baseUrl = 'https://wiki.projectgorgon.com/wiki';

        switch(type) {
            case 'items': return `${baseUrl}/Item:${cleanName}`;
            case 'skills': return `${baseUrl}/${cleanName}`;
            case 'abilities': return `${baseUrl}/Ability:${cleanName}`;
            case 'recipes': return `${baseUrl}/Recipe:${cleanName}`;
            case 'npcs': return `${baseUrl}/${cleanName}`;
            default: return `${baseUrl}/${cleanName}`;
        }
    };

    return (
        <a
            href={getUrl()}
            target="_blank"
            rel="noreferrer"
            className="absolute right-12 top-0 p-2 text-slate-600 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition-colors z-20"
            title="Open Wiki"
        >
            <Icon name="external-link" className="w-6 h-6" />
        </a>
    );
};

export default WikiButton;
