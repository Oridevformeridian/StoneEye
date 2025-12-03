import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { db } from '../db';
import ResultRow from '../components/ResultRow';

const BookmarksView = ({ onNavigate }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [items, setItems] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem('stone_eye_bookmarks');
        if (stored) {
            const parsed = JSON.parse(stored);
            setBookmarks(parsed);

            if (parsed.length > 0) {
                Promise.all(parsed.map(b => db.objects.get({ type: b.type, id: b.id })))
                    .then(res => setItems(res.filter(Boolean)));
            } else {
                setItems([]);
            }
        }
    }, []);

    return (
        <div className="p-4 md:p-8 pb-4 md:pb-0">
              <h2 className="text-2xl md:text-3xl font-light text-white mb-2">Bookmarks</h2>
              <p className="text-slate-400 mb-6 text-sm">Your pinned items and recipes.</p>

              {items.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      <Icon name="star" className="w-12 h-12 mb-4 mx-auto opacity-20" />
                      <p>No bookmarks yet.</p>
                      <p className="text-xs mt-2">Click the star icon on any item to pin it here.</p>
                  </div>
              ) : (
                  <div className="space-y-2">
                    {items.map(obj => (
                        <ResultRow key={`${obj.type}-${obj.id}`} obj={obj} onClick={() => onNavigate(obj.type, obj.id)} />
                    ))}
                  </div>
              )}
        </div>
    );
};

export default BookmarksView;
