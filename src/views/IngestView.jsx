import React, { useState, useEffect } from 'react';
import { db } from '../db/index.js';
import { KNOWN_FILES } from '../constants/index.js';
import Icon from '../components/Icon.jsx';
import LoadingBar from '../components/LoadingBar.jsx';
import { parseLogFileObject } from '../utils/logParser.js';

export default function IngestView({ onIngestComplete, autoStart }) {
    const [version, setVersion] = useState('439');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Ready');
    const [currentFile, setCurrentFile] = useState('');
    const [corsError, setCorsError] = useState(false);
    const [logs, setLogs] = useState([]);
    const [confirmPurge, setConfirmPurge] = useState(false);

    const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const processJson = async (filename, jsonData) => {
        const typeName = filename.replace('.json', '');
        const entries = [];
        addLog(`Parsing ${typeName}...`);
        for (const [key, val] of Object.entries(jsonData)) {
            let id = val.ID;
            if (!id && key.includes('_')) id = parseInt(key.split('_')[1]);
            if (!id) id = key;

            let name = val.Name || val.InternalName || val.DisplayName;
            if (!name) {
                if (typeName === 'skills') name = key; 
                else name = val.Description || key;
            }
            
            const refs = new Set();
            if (typeName === 'recipes') {
                if (val.ResultItems) val.ResultItems.forEach(r => r.ItemCode && refs.add(`item:${r.ItemCode}`));
                if (val.ProtoResultItems) val.ProtoResultItems.forEach(r => r.ItemCode && refs.add(`item:${r.ItemCode}`));
                if (val.Ingredients) val.Ingredients.forEach(i => i.ItemCode && refs.add(`item:${i.ItemCode}`));
                if (val.Skill) {
                     refs.add(`skill:${val.Skill}`);
                     refs.add(`skill:${val.Skill.replace('Skill_', '')}`);
                }
            }
            if (typeName === 'itemuses') refs.add(`item:${id}`);
            if (typeName === 'items' && val.Keywords) val.Keywords.forEach(k => k.startsWith('Ammo') && refs.add(`keyword:${k}`));
            if (typeName === 'skills' && val.AdvancementTable) refs.add(`advancementtable:${val.AdvancementTable}`);
            if (typeName === 'abilities') {
                if (val.Skill) {
                    refs.add(`skill:${val.Skill}`);
                    refs.add(`skill:${val.Skill.replace('Skill_', '')}`);
                }
                if (val.ItemsConsumed) val.ItemsConsumed.forEach(i => i.ItemCode && refs.add(`item:${i.ItemCode}`));
            }
            if (typeName === 'tsysclientinfo' && val.Skill) {
                 refs.add(`skill:${val.Skill}`);
            }
            
            entries.push({ type: typeName, id, name, data: val, refs: Array.from(refs), category: 'default' });
        }
        await db.objects.bulkPut(entries);
    };

    const finalizeData = async () => {
        setStatus('Indexing Skills & Icons...');
        
        const allSkills = await db.objects.where('type').equals('skills').toArray();
        const allAbilities = await db.objects.where('type').equals('abilities').toArray();
        const allRecipes = await db.objects.where('type').equals('recipes').toArray();

        const abilitySkillMap = {};
        const recipeSkillMap = {};

        allAbilities.forEach(ab => {
            if (ab.data.Skill && (ab.data.IconId || ab.data.IconID)) {
                if (!abilitySkillMap[ab.data.Skill]) {
                    abilitySkillMap[ab.data.Skill] = ab.data.IconId || ab.data.IconID;
                }
                if (!abilitySkillMap[`Skill_${ab.data.Skill}`]) {
                    abilitySkillMap[`Skill_${ab.data.Skill}`] = ab.data.IconId || ab.data.IconID;
                }
            }
        });

        allRecipes.forEach(rec => {
            if (rec.data.Skill) {
                recipeSkillMap[rec.data.Skill] = true;
                recipeSkillMap[`Skill_${rec.data.Skill}`] = true;
            }
        });

        const updates = [];
        for (const skill of allSkills) {
            let category = 'lore';
            let icon = skill.data.IconId || skill.data.IconID;
            const skillName = skill.name;
            const skillId = skill.id;

            if (!icon) {
                if (abilitySkillMap[skillName]) icon = abilitySkillMap[skillName];
                else if (abilitySkillMap[skillId]) icon = abilitySkillMap[skillId];
                else if (typeof skillId === 'string' && skillId.startsWith('Skill_') && abilitySkillMap[skillId.replace('Skill_', '')]) {
                    icon = abilitySkillMap[skillId.replace('Skill_', '')];
                }
            }

            if (!icon) {
                if (skillName === 'Fire Magic') icon = 3608;
                else icon = 5005;
            }

            if (skill.data.Combat) {
                category = 'active';
            } else if (recipeSkillMap[skillName] || recipeSkillMap[skillId]) {
                category = 'trade';
            } else {
                const hasAbilities = abilitySkillMap[skillName] || abilitySkillMap[skillId];
                if (hasAbilities) category = 'active';
            }

            if (skillName === 'Compassion' || skillName === 'Meditation') category = 'lore';

            skill.category = category;
            skill.derivedIcon = icon;
            updates.push(skill);
        }

        await db.objects.bulkPut(updates);
    };

    const runIngest = async () => {
        setLoading(true);
        try {
            const baseUrl = `https://cdn.projectgorgon.com/v${version}/data`;
            for (let i = 0; i < KNOWN_FILES.length; i++) {
                setStatus(`Downloading ${KNOWN_FILES[i]}`);
                setCurrentFile(KNOWN_FILES[i]);
                const res = await fetch(`${baseUrl}/${KNOWN_FILES[i]}`);
                await processJson(KNOWN_FILES[i], await res.json());
                setProgress(((i+1)/KNOWN_FILES.length)*90);
            }
            await finalizeData();
            setProgress(100);
            setStatus('Complete');
            onIngestComplete();
        } catch(e) { 
            console.error(e); 
            setStatus('Error'); 
        }
        setLoading(false);
    };

    useEffect(() => { if(autoStart) runIngest(); }, [autoStart]);
    
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        setLoading(true); setCorsError(false); setLogs([]);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setStatus(`Processing ${i+1}/${files.length}`);
            setCurrentFile(file.name);
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                
                if (json.Report === 'CharacterSheet') {
                    localStorage.setItem('gorgon_character_' + json.Character, JSON.stringify({ type: 'character', id: json.Character, data: json }));
                    addLog(`Imported Character Sheet for ${json.Character}`);
                } else if (json.Report === 'Storage') {
                     const charName = json.Character || 'Unknown';
                    localStorage.setItem('gorgon_inventory_' + charName, JSON.stringify({ type: 'inventory', id: charName, data: json }));
                    addLog(`Imported Storage Data for ${charName}`);
                } else {
                    await processJson(file.name.toLowerCase(), json);
                }
            } catch (err) {
                addLog(`Error: ${file.name}`);
            }
            setProgress(((i+1)/files.length)*100);
        }
        
        setLoading(false);
        setStatus('Complete');
        onIngestComplete();
    };

    const [parsedLogs, setParsedLogs] = useState([]);

    const handleLogUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setLoading(true);
        setStatus('Parsing logs');
        const allParsed = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setCurrentFile(file.name);
            try {
                const parsed = await parseLogFileObject(file);
                allParsed.push({ file: file.name, parsed });
                addLog(`Parsed ${file.name}: ${parsed.length} entries`);

                // If we have parsed entries, ingest them into the DB
                if (parsed && parsed.length > 0) {
                    const entries = parsed.map(p => {
                        const entryId = `${p.id}_${p.vendorName}`;
                        const name = p.vendorName || (`vendor_${p.id}`);
                        const refs = [];
                        if (p.npc) refs.push(`npc:${p.npc}`);
                        if (p.vendorName) refs.push(`vendor:${p.vendorName}`);
                        return {
                            type: 'vendors',
                            id: entryId,
                            name,
                            data: p,
                            refs,
                            category: 'vendor'
                        };
                    });

                    try {
                        await db.objects.bulkPut(entries);
                        addLog(`Ingested ${entries.length} vendor entries from ${file.name}`);
                    } catch (err) {
                        console.error('DB ingest error', err);
                        addLog(`DB ingest error for ${file.name}`);
                    }
                }
            } catch (err) {
                addLog(`Error parsing ${file.name}`);
            }
        }
        setParsedLogs(allParsed);
        setLoading(false);
        setStatus('Complete');
    };

    const handlePurge = () => {
        if (!confirmPurge) {
            setConfirmPurge(true);
            setTimeout(() => setConfirmPurge(false), 4000);
            return;
        }
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('gorgon_character_') || key.startsWith('gorgon_inventory_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        addLog(`Purged ${keysToRemove.length} user files.`);
        setConfirmPurge(false);
    };

    return (
        <div className="p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-light text-white mb-4">Data Import</h2>
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 mb-6">
                <div className="flex gap-4 items-end mb-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Version</label>
                        <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <button onClick={runIngest} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded font-medium transition-colors">{loading ? 'Fetching...' : 'Fetch All'}</button>
                </div>
                {loading && <LoadingBar progress={progress} status={status} subStatus={currentFile} />}
                {corsError && <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded text-sm"><p className="font-bold flex items-center gap-2"><Icon name="alert-triangle" className="w-4 h-4" /> CORS Error</p><div className="mt-3 p-3 bg-slate-900 rounded"><div className="text-xs text-slate-400 mb-2">Drag & Drop game data files or Character/Storage JSONs here:</div><input type="file" multiple accept=".json" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500" /></div></div>}
                {!corsError && !loading && (
                    <div className="mt-6 pt-6 border-t border-slate-700">
                        <div className="mb-4">
                            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Log Import / Parse</div>
                            <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-indigo-500 transition-colors mb-3">
                                <input type="file" multiple accept=".log,.txt" onChange={handleLogUpload} className="hidden" id="log-upload" />
                                <label htmlFor="log-upload" className="cursor-pointer text-sm text-slate-300 hover:text-white block">Click to select player log(s) and parse</label>
                            </div>
                            {parsedLogs.length > 0 && (
                                <div className="space-y-2">
                                    {parsedLogs.map((p,i) => (
                                        <div key={i} className="flex items-center justify-between bg-slate-900/60 p-2 rounded">
                                            <div className="text-xs text-slate-300">{p.file} — {p.parsed.length} entries ingested</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handlePurge} 
                            className={`block w-full text-right text-xs font-bold uppercase tracking-wider mb-4 transition-colors ${confirmPurge ? 'text-white bg-red-600 py-2 px-3 rounded' : 'text-red-500 hover:text-red-400 hover:underline'}`}
                        >
                            {confirmPurge ? "CONFIRM PURGE?" : "PURGE CHARACTER DATA"}
                        </button>
                        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">User Data Import</div>
                        <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-indigo-500 transition-colors">
                            <input type="file" multiple accept=".json" onChange={handleFileUpload} className="hidden" id="user-upload" />
                            <label htmlFor="user-upload" className="cursor-pointer text-sm text-slate-300 hover:text-white block">Click to upload Character/Storage JSON</label>
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto border border-slate-800">{logs.length === 0 ? <span className="opacity-50">Log output waiting...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
    );
}
