import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from './db/index.js';
import { KNOWN_FILES, CATEGORY_META, FAVOR_LEVELS, getCategoryMeta } from './constants/index.js';
import Icon from './components/Icon.jsx';
import Badge from './components/Badge.jsx';
import GameIcon from './components/GameIcon.jsx';
import WikiButton from './components/WikiButton.jsx';
import LoadingBar from './components/LoadingBar.jsx';
import NavButton from './components/NavButton.jsx';
import MobileNavBtn from './components/MobileNavBtn.jsx';
import ReferenceList from './components/ReferenceList.jsx';
import ResultRow from './components/ResultRow.jsx';
import ItemDetail from './components/ItemDetail.jsx';
import RecipeDetail from './components/RecipeDetail.jsx';
import AbilityDetail from './components/AbilityDetail.jsx';
import SkillDetail from './components/SkillDetail.jsx';
import TreasureDetail from './components/TreasureDetail.jsx';
import GenericDetail from './components/GenericDetail.jsx';
import StatBox from './components/StatBox.jsx';

// Views
import IngestView from './views/IngestView.jsx';
import BookmarksView from './views/BookmarksView.jsx';
import NpcServicesView from './views/NpcServicesView.jsx';
import ActiveSkillsView from './views/ActiveSkillsView.jsx';
import TradeSkillsView from './views/TradeSkillsView.jsx';
import LoreView from './views/LoreView.jsx';
import TreasureListView from './views/TreasureListView.jsx';
import MyCharacterView from './views/MyCharacterView.jsx';
import EventsView from './views/EventsView.jsx';

// Helper Views
const LandingView = ({ onSelectCategory }) => {
    return (
        <div className="p-4 md:p-8 pb-4 md:pb-0">
            <h2 className="text-2xl md:text-3xl font-light text-white mb-6">Data Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                {KNOWN_FILES.map(file => {
                    const meta = getCategoryMeta(file);
                    return (
                        <div 
                            key={meta.key}
                            onClick={() => onSelectCategory(meta.key)}
                            className="bg-slate-800/50 active:bg-slate-700 hover:bg-slate-700/50 rounded-xl p-4 cursor-pointer border border-slate-700 hover:border-indigo-500/50 transition-all group shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2.5 bg-slate-900 rounded-lg group-hover:ring-1 group-hover:ring-indigo-500/50">
                                    {meta.gameIconId ? (
                                        <GameIcon iconId={meta.gameIconId} size="w-8 h-8" />
                                    ) : (
                                        <Icon name={meta.icon} className="w-8 h-8 text-indigo-400" />
                                    )}
                                </div>
                            </div>
                            <h3 className="text-sm md:text-base font-bold text-slate-200 mb-0.5">{meta.label}</h3>
                            <p className="text-[10px] md:text-xs text-slate-500 line-clamp-1">{meta.desc}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MobileReferenceView = ({ onNavigate, switchTab }) => (
    <div className="p-4 md:p-8 pb-4 md:pb-0 h-full overflow-y-auto">
        <h2 className="text-3xl font-light text-white mb-6">Reference</h2>
        <div className="grid grid-cols-2 gap-4">
            <div onClick={() => switchTab('my-character')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-indigo-400 ring-1 ring-slate-700">
                    <Icon name="user" className="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Chars</span>
                    <span className="text-xs text-slate-500">My Character</span>
                </div>
            </div>

            <div onClick={() => switchTab('events')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-indigo-400 ring-1 ring-slate-700">
                    <Icon name="clock" className="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Events</span>
                    <span className="text-xs text-slate-500">Scheduled Alerts</span>
                </div>
            </div>

            <div onClick={() => switchTab('explore')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-indigo-400 ring-1 ring-slate-700">
                    <Icon name="search" className="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Explore</span>
                    <span className="text-xs text-slate-500">Browse Data</span>
                </div>
            </div>

            <div onClick={() => switchTab('npc-services')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-indigo-400 ring-1 ring-slate-700">
                    <GameIcon iconId={3402} size="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">NPCs</span>
                    <span className="text-xs text-slate-500">Services & Storage</span>
                </div>
            </div>

            <div onClick={() => switchTab('ingest')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-green-500/50 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-green-400 ring-1 ring-slate-700">
                    <Icon name="download" className="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Import</span>
                    <span className="text-xs text-slate-500">Game Data</span>
                </div>
            </div>

            <div onClick={() => switchTab('active-skills')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-amber-400 ring-1 ring-slate-700">
                    <GameIcon iconId={3608} size="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Skills</span>
                    <span className="text-xs text-slate-500">Combat & Active</span>
                </div>
            </div>

            <div onClick={() => switchTab('trade-skills')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-emerald-400 ring-1 ring-slate-700">
                    <GameIcon iconId={5002} size="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Crafting</span>
                    <span className="text-xs text-slate-500">Trades & Arts</span>
                </div>
            </div>

            <div onClick={() => switchTab('lore')} className="bg-slate-800/50 aspect-square p-4 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-blue-400 ring-1 ring-slate-700">
                    <GameIcon iconId={5005} size="w-10 h-10" />
                </div>
                <div className="text-center">
                    <span className="block font-bold text-slate-200 text-lg">Lore</span>
                    <span className="text-xs text-slate-500">Books & More</span>
                </div>
            </div>

            <div onClick={() => switchTab('treasure')} className="col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800 active:bg-slate-700 flex items-center gap-6 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 shrink-0 rounded-full bg-slate-900 flex items-center justify-center text-purple-400 ring-1 ring-slate-700">
                    <GameIcon iconId={3302} size="w-10 h-10" />
                </div>
                <div>
                    <span className="block font-bold text-slate-200 text-lg">Treasure Mods</span>
                    <span className="text-xs text-slate-500">Equipment modifications database</span>
                </div>
            </div>

             <div onClick={() => switchTab('bookmarks')} className="col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800 active:bg-slate-700 flex items-center gap-6 cursor-pointer transition-all shadow-lg shadow-black/20">
                <div className="w-16 h-16 shrink-0 rounded-full bg-slate-900 flex items-center justify-center text-yellow-400 ring-1 ring-slate-700">
                    <Icon name="star" className="w-8 h-8" />
                </div>
                <div>
                    <span className="block font-bold text-slate-200 text-lg">Bookmarks</span>
                    <span className="text-xs text-slate-500">Your saved items</span>
                </div>
            </div>
        </div>
    </div>
);

function ExplorerView({ initialParams, onNavigate, onBack }) {
    const [query, setQuery] = useState('');
    const [filterType, setFilterType] = useState('items');
    const [limit, setLimit] = useState(50);
    const [results, setResults] = useState([]);
    const [selectedObj, setSelectedObj] = useState(null);
    const [referencingObjs, setReferencingObjs] = useState([]);
    const [isBookmarked, setIsBookmarked] = useState(false);
    
    const observerTarget = useRef(null);
    const categories = KNOWN_FILES.map(f => f.replace('.json', ''));

    useEffect(() => {
        if (initialParams) {
            setFilterType(initialParams.type);
            const fetchInitial = async () => {
                let obj = await db.objects.get({ type: initialParams.type, id: initialParams.id });
                if (!obj && typeof initialParams.id === 'string') {
                     const q = initialParams.id.toLowerCase();
                     const matches = await db.objects.where('type').equals(initialParams.type)
                        .filter(o => o.name.toLowerCase() === q || (o.data.InternalName && o.data.InternalName.toLowerCase().includes(q)))
                        .toArray();
                     if (matches.length > 0) obj = matches[0];
                }
                if (obj) setSelectedObj(obj);
            };
            fetchInitial();
        } else {
            setSelectedObj(null);
        }
    }, [initialParams]);

    useEffect(() => {
        const checkBookmark = () => {
            if (!selectedObj) return;
            const bookmarks = JSON.parse(localStorage.getItem('stone_eye_bookmarks') || '[]');
            setIsBookmarked(bookmarks.some(b => b.type === selectedObj.type && b.id === selectedObj.id));
        };
        checkBookmark();
    }, [selectedObj]);

    const toggleBookmark = () => {
        if (!selectedObj) return;
        const bookmarks = JSON.parse(localStorage.getItem('stone_eye_bookmarks') || '[]');
        const exists = bookmarks.some(b => b.type === selectedObj.type && b.id === selectedObj.id);
        let newBookmarks;
        if (exists) {
            newBookmarks = bookmarks.filter(b => !(b.type === selectedObj.type && b.id === selectedObj.id));
            setIsBookmarked(false);
        } else {
            newBookmarks = [...bookmarks, { type: selectedObj.type, id: selectedObj.id, name: selectedObj.name }];
            setIsBookmarked(true);
        }
        localStorage.setItem('stone_eye_bookmarks', JSON.stringify(newBookmarks));
    };

    const handleNavigate = (type, id) => {
        onNavigate(type, id);
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            let collection = db.objects.where('type').equals(filterType);
            const q = query.toLowerCase();

            if (initialParams && initialParams.type === 'tsysclientinfo' && initialParams.query && filterType === 'tsysclientinfo') {
                 collection = collection.filter(obj => obj.data.Skill === initialParams.query);
            } 
            else if (q) {
                collection = collection.filter(obj => {
                    if (obj.name.toLowerCase().includes(q)) return true;
                    if (obj.data.Skill && obj.data.Skill.toLowerCase().includes(q)) return true;
                    if (obj.data.InternalName && obj.data.InternalName.toLowerCase().includes(q)) return true;
                    if (obj.data.Keywords && Array.isArray(obj.data.Keywords)) {
                        if (obj.data.Keywords.some(k => k.toLowerCase().includes(q))) return true;
                    }
                    return false;
                });
            }
            const res = await collection.limit(limit).toArray();
            setResults(res);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, filterType, limit, initialParams]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) setLimit(l => l + 50); }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [results]);

    useEffect(() => {
        const findRefs = async () => {
            if (!selectedObj) { setReferencingObjs([]); return; }
            const map = { 'items': 'item', 'skills': 'skill', 'recipes': 'recipe', 'abilities': 'ability' };
            const prefix = map[selectedObj.type] || selectedObj.type;
            const refKey = `${prefix}:${selectedObj.id}`;
            let keysToCheck = [refKey];
            if (typeof selectedObj.id === 'string' && selectedObj.id.startsWith('Skill_')) {
                keysToCheck.push(`${prefix}:${selectedObj.id.replace('Skill_', '')}`);
            }
            const refs = await db.objects.where('refs').anyOf(keysToCheck).toArray();
            setReferencingObjs(refs);
        };
        findRefs();
    }, [selectedObj]);

    return (
        <div className="flex h-full">
            <div className={`w-full md:w-1/3 min-w-[300px] border-r border-slate-800 flex flex-col bg-slate-900 ${selectedObj ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900 z-10">
                    <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setQuery(''); setSelectedObj(null); }} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none">
                        {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                    <div className="relative">
                        <Icon name="search" className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        <input type="text" placeholder={`Search ${filterType}...`} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pb-4 md:pb-0">
                    {results.map(obj => <ResultRow key={`${obj.type}-${obj.id}`} obj={obj} onClick={() => handleNavigate(obj.type, obj.id)} isSelected={selectedObj?.id === obj.id && selectedObj?.type === obj.type} />)}
                    {results.length >= limit && <div ref={observerTarget} className="p-4 flex justify-center"><Icon name="loader-2" className="w-6 h-6 animate-spin text-indigo-500" /></div>}
                </div>
            </div>
            <div className={`w-full md:flex-1 overflow-y-auto bg-slate-950 ${selectedObj ? 'flex' : 'hidden md:flex'} flex-col`}>
                {selectedObj ? (
                    <div className="max-w-4xl mx-auto w-full">
                        <div className="md:hidden sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
                            <button onClick={onBack} className="flex items-center text-indigo-400 font-medium"><Icon name="chevron-left" className="w-5 h-5" /> Back</button>
                        </div>
                        <div className="p-4 md:p-8">
                            <div className="flex items-start gap-4 mb-6 relative">
                                <WikiButton type={selectedObj.type} name={selectedObj.name} />
                                <button 
                                    onClick={toggleBookmark}
                                    className="absolute right-0 top-0 p-2 hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    <Icon 
                                        name="star" 
                                        className={`w-6 h-6 ${isBookmarked ? 'text-amber-400 fill-amber-400 animate-pop' : 'text-slate-600'}`} 
                                    />
                                </button>

                                {(selectedObj.data.IconId || selectedObj.data.IconID) && <GameIcon iconId={selectedObj.data.IconId || selectedObj.data.IconID} size="w-16 h-16" className="rounded-xl shadow-lg" />}
                                <div className="flex-1 min-w-0 pr-10">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/50 text-indigo-300 mb-1 uppercase border border-indigo-800">{selectedObj.type}</span>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight break-words">{selectedObj.name}</h2>
                                    <div className="font-mono text-xs text-slate-500 mt-1">ID: {selectedObj.id}</div>
                                </div>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-4 md:p-6 mb-8 border border-slate-800/50 shadow-sm">
                                <div className="text-slate-500 mb-2 text-[10px] uppercase tracking-wider font-bold">Description</div>
                                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{selectedObj.data.Description || selectedObj.data.Desc || "No description provided."}</div>
                            </div>
                            {(() => {
                                switch (selectedObj.type) {
                                    case 'items': return <ItemDetail data={selectedObj.data} referencedBy={referencingObjs} onNavigate={handleNavigate} />;
                                    case 'recipes': return <RecipeDetail data={selectedObj.data} referencedBy={referencingObjs} onNavigate={handleNavigate} />;
                                    case 'abilities': return <AbilityDetail data={selectedObj.data} referencedBy={referencingObjs} onNavigate={handleNavigate} />;
                                    case 'skills': return <SkillDetail data={selectedObj.data} referencedBy={referencingObjs} onNavigate={handleNavigate} />;
                                    case 'tsysclientinfo': return <TreasureDetail data={selectedObj.data} onNavigate={handleNavigate} />;
                                    default: return <GenericDetail data={selectedObj.data} referencedBy={referencingObjs} onNavigate={handleNavigate} />;
                                }
                            })()}
                            <div className="mt-8 pb-4 md:pb-0">
                                <div className="text-slate-600 text-[10px] uppercase tracking-wider font-bold mb-2">Raw JSON</div>
                                <pre className="bg-slate-950 p-4 rounded-lg text-[10px] font-mono text-emerald-600/80 overflow-x-auto border border-slate-900 whitespace-pre-wrap break-words">{JSON.stringify(selectedObj.data, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8"><LandingView onSelectCategory={(cat) => setFilterType(cat)} /></div>
                )}
            </div>
        </div>
    );
}

// Main App Component
export default function App() {
    const [historyStack, setHistoryStack] = useState([{ tab: 'loading', params: null }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const [autoIngest, setAutoIngest] = useState(false);

    const activeState = historyStack[historyIndex];
    const activeTab = activeState.tab;
    const explorerParams = activeState.params;

    useEffect(() => {
        const check = async () => {
             const count = await db.objects.count();
             setTotalRecords(count);
             if(count > 0) {
                 replaceRoute('my-character');
             } else {
                 setAutoIngest(true);
                 replaceRoute('ingest');
             }
        }
        check();
    }, []);

    useEffect(() => {
        const handlePopState = (event) => {
            if (historyIndex > 0) {
                setHistoryIndex(prev => prev - 1);
                setHistoryStack(prev => prev.slice(0, prev.length - 1));
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [historyIndex]);

    const navigate = (tab, params = null) => {
        const nextHistory = historyStack.slice(0, historyIndex + 1);
        nextHistory.push({ tab, params });
        setHistoryStack(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        try {
            window.history.pushState({ index: nextHistory.length - 1 }, '');
        } catch (e) {
            // Ignore pushState errors in restricted environments
        }
    };

    const replaceRoute = (tab, params = null) => {
        const nextHistory = historyStack.slice(0, historyIndex);
        nextHistory.push({ tab, params });
        setHistoryStack(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
    };

    const goBack = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleIngestComplete = async () => {
        const count = await db.objects.count();
        setTotalRecords(count);
        setAutoIngest(false);
        navigate('my-character');
    };

    const handleExplorerNavigate = (type, id, query) => {
        navigate('explore', { type, id, query });
    }

    if (activeTab === 'loading') {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
                <Icon name="database" className="w-12 h-12 mb-4 animate-pulse text-indigo-500" />
                <div className="text-lg font-light">Checking Database...</div>
            </div>
        );
    }

    return (
        <div className="flex h-full font-sans flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <div id="desktop-sidebar" className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                        <Icon name="database" className="w-6 h-6" /> The Stone Eye
                    </h1>
                    <p className="text-xs text-slate-500 mt-2">Fantasy Matchmaker Service</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <NavButton active={activeTab === 'explore'} onClick={() => navigate('explore')} icon="search" label="Explorer" />
                    <NavButton active={activeTab === 'bookmarks'} onClick={() => navigate('bookmarks')} icon="star" label="Bookmarks" />
                    <NavButton active={activeTab === 'my-character'} onClick={() => navigate('my-character')} icon="user" label="My Character" />
                    <NavButton active={activeTab === 'events'} onClick={() => navigate('events')} icon="bell" label="Events" />
                    <NavButton active={activeTab === 'active-skills'} onClick={() => navigate('active-skills')} icon="zap" label="Active Skills" />
                    <NavButton active={activeTab === 'trade-skills'} onClick={() => navigate('trade-skills')} icon="hammer" label="Arts & Crafts" />
                    <NavButton active={activeTab === 'lore'} onClick={() => navigate('lore')} icon="book-open" label="Lore & More" />
                    <NavButton active={activeTab === 'npc-services'} onClick={() => navigate('npc-services')} icon="users" label="NPC Services" />
                    <NavButton active={activeTab === 'treasure'} onClick={() => navigate('treasure')} icon="gem" label="Treasure Mods" />
                    <NavButton active={activeTab === 'ingest'} onClick={() => navigate('ingest')} icon="download" label="Import Data" />
                </nav>
            </div>

            {/* Mobile Content Area */}
            <div className="flex-1 overflow-hidden relative bg-slate-950 pb-2 md:pb-0 main-content">
                {activeTab === 'ingest' && (
                    <div className="h-full overflow-y-auto">
                        <IngestView onIngestComplete={handleIngestComplete} autoStart={autoIngest} />
                    </div>
                )}
                {activeTab === 'reference' && (
                    <MobileReferenceView onNavigate={handleExplorerNavigate} switchTab={navigate} />
                )}
                {activeTab === 'bookmarks' && (
                    <div className="h-full overflow-y-auto">
                        <BookmarksView onNavigate={handleExplorerNavigate} />
                    </div>
                )}
                {activeTab === 'active-skills' && (
                    <div className="h-full overflow-y-auto">
                        <ActiveSkillsView onNavigate={handleExplorerNavigate} />
                    </div>
                )}
                {activeTab === 'trade-skills' && (
                    <div className="h-full overflow-y-auto">
                        <TradeSkillsView onNavigate={handleExplorerNavigate} />
                    </div>
                )}
                {activeTab === 'lore' && (
                    <div className="h-full overflow-y-auto">
                        <LoreView onNavigate={handleExplorerNavigate} />
                    </div>
                )}
                 {activeTab === 'treasure' && (
                    <div className="h-full overflow-y-auto">
                        <TreasureListView onNavigate={handleExplorerNavigate} />
                    </div>
                )}
                {activeTab === 'npc-services' && (
                    <div className="h-full overflow-y-auto">
                        <NpcServicesView onNavigate={handleExplorerNavigate} />
                    </div>
                )}
                {activeTab === 'my-character' && (
                    <div className="h-full overflow-y-auto">
                        <MyCharacterView onNavigate={handleExplorerNavigate} goToIngest={() => navigate('ingest')} />
                    </div>
                )}
                {activeTab === 'events' && (
                    <div className="h-full overflow-y-auto">
                        <EventsView />
                    </div>
                )}
                {activeTab === 'explore' && (
                    totalRecords > 0 ? (
                        <ExplorerView 
                            initialParams={explorerParams} 
                            onNavigate={handleExplorerNavigate} 
                            onBack={goBack} 
                        />
                    ) : (
                        <div className="h-full overflow-y-auto">
                            <IngestView onIngestComplete={handleIngestComplete} autoStart={false} />
                        </div>
                    )
                )}
            </div>

            {/* Mobile Bottom Nav */}
            <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 nav-safe-padding z-50" aria-label="Mobile navigation">
                <div className="grid grid-cols-4 h-16">
                            <MobileNavBtn active={activeTab === 'my-character'} onClick={() => navigate('my-character')} icon="user" label="Me" />
                            <MobileNavBtn active={activeTab === 'events'} onClick={() => navigate('events')} icon="clock" label="Events" />
                            <MobileNavBtn active={activeTab === 'reference'} onClick={() => navigate('reference')} icon="book-open" label="Reference" />
                            <MobileNavBtn active={activeTab === 'ingest'} onClick={() => navigate('ingest')} icon="download" label="Import" />
                </div>
            </nav>
        </div>
    );
}
