import React, { useState, useEffect } from 'react';
import { db } from '../db/index.js';
import { KNOWN_FILES } from '../constants/index.js';
import Icon from '../components/Icon.jsx';
import LoadingBar from '../components/LoadingBar.jsx';
import { parseLogFileObject } from '../utils/logParser.js';
import parseAndStoreLog from '../utils/unifiedLogParser.js';
import LogService from '../services/logService.js';
import ElectronSettings from '../components/ElectronSettings.jsx';

export default function IngestView({ onIngestComplete, autoStart }) {
    const [version, setVersion] = useState('439');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Ready');
    const [currentFile, setCurrentFile] = useState('');
    const [corsError, setCorsError] = useState(false);
    const [logs, setLogs] = useState([]);
    const [confirmPurge, setConfirmPurge] = useState(false);
    const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
    const [hasCharacterData, setHasCharacterData] = useState(false);

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
        // Also persist to localStorage for background visibility
        const persistedLogs = JSON.parse(localStorage.getItem('ingest_logs') || '[]');
        persistedLogs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
        // Keep only last 100 logs
        if (persistedLogs.length > 100) persistedLogs.length = 100;
        localStorage.setItem('ingest_logs', JSON.stringify(persistedLogs));
    };

    const checkCharacterData = () => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('gorgon_character_')) {
                setHasCharacterData(true);
                return;
            }
        }
        setHasCharacterData(false);
    };

    useEffect(() => {
        checkCharacterData();
        
        // Load persisted logs on mount
        const persistedLogs = JSON.parse(localStorage.getItem('ingest_logs') || '[]');
        if (persistedLogs.length > 0) {
            setLogs(persistedLogs);
        }
    }, []);

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
                    // Character sheet is authoritative - completely replace
                    const charKey = `gorgon_character_${json.Character}`;
                    localStorage.setItem(charKey, JSON.stringify({ type: 'character', id: json.Character, data: json }));
                    addLog(`✓ Imported Character Sheet for ${json.Character} (authoritative)`);
                } else if (json.Report === 'Storage') {
                    // Storage is authoritative - completely replace
                    const charName = json.Character || 'Unknown';
                    const invKey = `gorgon_inventory_${charName}`;
                    localStorage.setItem(invKey, JSON.stringify({ type: 'inventory', id: charName, data: json }));
                    addLog(`✓ Imported Storage for ${charName} (authoritative)`);
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

    // Expose JSON import handler for ElectronSettings
    useEffect(() => {
        window.handleJsonImport = async (file) => {
            setLoading(true);
            setStatus(`Processing ${file.name}`);
            setCurrentFile(file.name);
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                
                if (json.Report === 'CharacterSheet') {
                    // Character sheet is authoritative - completely replace existing data
                    const charKey = `gorgon_character_${json.Character}`;
                    localStorage.setItem(charKey, JSON.stringify({ type: 'character', id: json.Character, data: json }));
                    addLog(`✓ Imported Character Sheet for ${json.Character} (authoritative)`);
                } else if (json.Report === 'Storage') {
                    // Storage is authoritative - completely replace existing inventory data
                    const charName = json.Character || 'Unknown';
                    const invKey = `gorgon_inventory_${charName}`;
                    localStorage.setItem(invKey, JSON.stringify({ type: 'inventory', id: charName, data: json }));
                    addLog(`✓ Imported Storage for ${charName} (authoritative - ${Object.keys(json.Inventory || {}).length} inventory slots, ${Object.keys(json.StorageVaults || {}).length} storage vaults)`);
                } else {
                    addLog(`⚠ Unknown report type in ${file.name}`);
                }
            } catch (err) {
                addLog(`✗ Error: ${file.name} - ${err.message}`);
            }
            setLoading(false);
            setStatus('Complete');
        };
        
        return () => {
            delete window.handleJsonImport;
        };
    }, []);

    const handleLogUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setLoading(true);
        setStatus('Parsing logs with unified log system');
        
        let totalWritten = 0;
        let totalSkipped = 0;
        const charactersSeen = new Set();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setCurrentFile(file.name);
            setProgress((i / files.length) * 100);
            
            try {
                let content;
                
                // Check if file is gzipped
                if (file.name.endsWith('.gz')) {
                    // Decompress gzipped file
                    const arrayBuffer = await file.arrayBuffer();
                    const decompressedStream = new Response(
                        new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'))
                    );
                    content = await decompressedStream.text();
                } else {
                    // Regular text file
                    content = await file.text();
                }
                
                const result = await parseAndStoreLog(content, file.name);
                
                totalWritten += result.entriesWritten;
                totalSkipped += result.skippedDuplicates || 0;
                if (result.character) charactersSeen.add(result.character);
                
                addLog(`✓ ${file.name}: ${result.entriesWritten} entries (${result.skippedDuplicates || 0} duplicates) for ${result.character}`);
            } catch (err) {
                addLog(`❌ Error parsing ${file.name}: ${err.message}`);
                console.error('Parse error:', err);
            }
        }
        
        setProgress(100);
        setStatus('Complete');
        setLoading(false);
        setCurrentFile('');
        addLog(`✅ Completed: ${totalWritten} entries written, ${totalSkipped} duplicates skipped`);
        addLog(`📊 Characters: ${Array.from(charactersSeen).join(', ')}`);
        
        // Trigger callback if provided
        if (onIngestComplete) {
            onIngestComplete();
        }
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

    const handlePurgeAll = async () => {
        if (!confirmPurgeAll) {
            setConfirmPurgeAll(true);
            setTimeout(() => setConfirmPurgeAll(false), 4000);
            return;
        }
        
        try {
            // Clear localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('gorgon_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            
            // Clear ALL IndexedDB tables
            await db.objects.clear();
            await db.logEntries.clear();
            await db.logs.clear();
            
            addLog(`Purged all data: ${keysToRemove.length} localStorage items and entire database (objects, logs, logEntries).`);
            setConfirmPurgeAll(false);
        } catch (err) {
            addLog(`Error purging all data: ${err.message}`);
            setConfirmPurgeAll(false);
        }
    };

    const handleExportBackup = async () => {
        try {
            addLog('Creating backup...');
            
            // Export localStorage
            const localStorageData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('gorgon_') || key === 'stone_eye_bookmarks' || key === 'ingest_logs') {
                    localStorageData[key] = localStorage.getItem(key);
                }
            }
            
            // Export IndexedDB
            const dbObjects = await db.objects.toArray();
            
            const backup = {
                version: 1,
                timestamp: new Date().toISOString(),
                localStorage: localStorageData,
                indexedDB: dbObjects
            };
            
            // Create downloadable JSON file
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stoneeye-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            addLog(`✓ Backup created: ${dbObjects.length} database objects, ${Object.keys(localStorageData).length} localStorage items`);
        } catch (err) {
            addLog(`✗ Backup failed: ${err.message}`);
        }
    };

    const handleRestoreBackup = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            addLog(`Restoring backup from ${file.name}...`);
            
            const text = await file.text();
            const backup = JSON.parse(text);
            
            if (!backup.version || !backup.localStorage || !backup.indexedDB) {
                throw new Error('Invalid backup file format');
            }
            
            // Restore localStorage
            Object.entries(backup.localStorage).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            
            // Restore IndexedDB
            await db.objects.bulkPut(backup.indexedDB);
            
            addLog(`✓ Restore complete: ${backup.indexedDB.length} database objects, ${Object.keys(backup.localStorage).length} localStorage items`);
            addLog(`Backup was created on ${new Date(backup.timestamp).toLocaleString()}`);
            
            checkCharacterData();
            
            if (window.showToast) {
                window.showToast('Backup restored successfully! Refresh the page to see all changes.', 'success');
            }
        } catch (err) {
            addLog(`✗ Restore failed: ${err.message}`);
            if (window.showToast) {
                window.showToast(`Restore failed: ${err.message}`, 'error');
            }
        }
        
        // Reset file input
        event.target.value = '';
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h2 className="text-2xl font-light text-white mb-4">Data Import</h2>
            
            {!window.electron && (
                <div className="mb-6 bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <Icon name="download" className="w-5 h-5 text-indigo-400" />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-white">Want auto-import and log watching?</div>
                            <div className="text-xs text-slate-400 mt-1">Download the desktop app for automatic log monitoring and imports</div>
                        </div>
                        <a 
                            href="./assets/stoneeye_install.exe" 
                            download
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            Download Desktop App
                        </a>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {window.electron && (
                    <div>
                        <h3 className="text-lg font-medium text-white mb-3">Desktop Auto-Watch</h3>
                        <ElectronSettings 
                            onLiveLogUpdate={async (content) => {
                                // Parse the new log content with unified parser
                                try {
                                    console.log(`[LiveMonitor] Received ${content.length} bytes from electron`);
                                    const result = await parseAndStoreLog(content, 'live-player.log');
                                    
                                    if (result.entriesWritten === 0) {
                                        // Log when updates are checked but no new data
                                        console.log(`[LiveMonitor] No new entries. Skipped ${result.skippedDuplicates || 0} duplicates`);
                                        return; // Nothing new
                                    }
                                    
                                    console.log(`[LiveMonitor] SUCCESS: ${result.entriesWritten} new entries for ${result.character}`);
                                    addLog(`Live update: ${result.entriesWritten} entries for ${result.character}`);
                                    
                                    // Trigger global data refresh for all views
                                    window.dispatchEvent(new CustomEvent('dataUpdated', {
                                        detail: {
                                            character: result.character,
                                            entriesWritten: result.entriesWritten,
                                            source: 'live-log'
                                        }
                                    }));
                                    
                                    // Show toast notification for background updates
                                    if (window.showToast) {
                                        window.showToast(`Live update: ${result.entriesWritten} entries`, 'success');
                                    }
                                } catch (err) {
                                    console.error('[LiveMonitor] ERROR:', err);
                                    addLog(`❌ Live update error: ${err.message}`);
                                }
                            }}
                            onArchivedLogImport={async (content, filename) => {
                                // Parse archived log with unified parser
                                try {
                                    setLoading(true);
                                    setStatus(`Processing archived log: ${filename}`);
                                    setCurrentFile(filename);
                                    
                                    const result = await parseAndStoreLog(content, filename);
                                    
                                    addLog(`✓ ${filename}: ${result.entriesWritten} entries (${result.skippedDuplicates || 0} duplicates) for ${result.character}`);
                                    
                                    setLoading(false);
                                    setStatus('Complete');
                                    setCurrentFile('');
                                } catch (err) {
                                    console.error('Archived log parse error:', err);
                                    addLog(`❌ Error parsing ${filename}: ${err.message}`);
                                    setLoading(false);
                                    setStatus('Error');
                                }
                            }}
                            onImportLog={async (file) => {
                                // Use unified parser for archived log imports (supports .log and .log.gz)
                                setLoading(true);
                                setStatus('Processing archived log');
                                setCurrentFile(file.name);
                                
                                try {
                                    const content = await file.text();
                                    const result = await parseAndStoreLog(content, file.name);
                                    
                                    addLog(`✓ ${file.name}: ${result.entriesWritten} entries (${result.skippedDuplicates || 0} duplicates) for ${result.character}`);
                                    
                                    setLoading(false);
                                    setStatus('Complete');
                                    setCurrentFile('');
                                } catch (err) {
                                    console.error('Archived log parse error:', err);
                                    addLog(`❌ Error parsing ${file.name}: ${err.message}`);
                                    setLoading(false);
                                    setStatus('Error');
                                }
                            }} />
                    </div>
                )}
                
                <div className={window.electron ? '' : 'lg:col-span-2'}>
                    <h3 className="text-lg font-medium text-white mb-3">Manual Import</h3>
                    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
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
                            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                Player Log Import
                            </div>
                            <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-indigo-500 transition-colors mb-3">
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".log,.log.gz,.gz,.txt,*" 
                                    onChange={handleLogUpload} 
                                    className="hidden" 
                                    id="log-upload" 
                                />
                                <label 
                                    htmlFor="log-upload" 
                                    className="cursor-pointer text-sm text-slate-300 hover:text-white block"
                                >
                                    Click to upload player log files (.log or .log.gz)
                                </label>
                                <div className="text-[10px] text-slate-500 mt-2">Automatically detects character from login events</div>
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
                        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">User Data Import</div>
                        <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-indigo-500 transition-colors mb-4">
                            <input type="file" multiple accept=".json" onChange={handleFileUpload} className="hidden" id="user-upload" />
                            <label htmlFor="user-upload" className="cursor-pointer text-sm text-slate-300 hover:text-white block">Click to upload Character/Storage JSON</label>
                        </div>
                        <div className="space-y-2">
                            <button 
                                onClick={handleExportBackup}
                                className="block w-full text-center text-xs font-bold uppercase tracking-wider py-2 px-3 rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
                            >
                                💾 Export Backup
                            </button>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    accept=".json" 
                                    onChange={handleRestoreBackup} 
                                    className="hidden" 
                                    id="restore-backup" 
                                />
                                <label 
                                    htmlFor="restore-backup"
                                    className="block w-full text-center text-xs font-bold uppercase tracking-wider py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                                >
                                    📂 Restore Backup
                                </label>
                            </div>
                            <div className="h-px bg-slate-700 my-3"></div>
                            <button 
                                onClick={handlePurge} 
                                className={`block w-full text-center text-xs font-bold uppercase tracking-wider transition-colors ${confirmPurge ? 'text-white bg-red-600 py-2 px-3 rounded' : 'text-red-500 hover:text-red-400 hover:underline'}`}
                            >
                                {confirmPurge ? "CONFIRM PURGE?" : "PURGE CHARACTER DATA"}
                            </button>
                            <button 
                                onClick={handlePurgeAll} 
                                className={`block w-full text-center text-xs font-bold uppercase tracking-wider transition-colors ${confirmPurgeAll ? 'text-white bg-red-700 py-2 px-3 rounded' : 'text-red-600 hover:text-red-500 hover:underline'}`}
                            >
                                {confirmPurgeAll ? "CONFIRM PURGE ALL?" : "PURGE ALL DATA"}
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </div>
            </div>
            
            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto border border-slate-800">{logs.length === 0 ? <span className="opacity-50">Log output waiting...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
    );
}
