import { useEffect, useState } from 'react';
import { useStore, type Note } from './store/useStore';
import { useTranslation } from 'react-i18next';
import { Plus, Settings, BarChart2, MessageSquare, Save, X, Search, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const API_BASE = '/api';

export default function App() {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const [view, setView] = useState<'notes' | 'settings' | 'dashboard'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Debounced Auto-save
  useEffect(() => {
    const activeNote = store.activeTabs.find(t => t.id === store.currentTabId);
    if (!activeNote) return;

    const timer = setTimeout(() => {
      // If it's a draft but completely empty, maybe we don't save yet to avoid spamming the DB, 
      // but the user might have just typed something. We'll save if it has content or title changed from default.
      if (activeNote.isDraft && activeNote.title === t('new_note') && activeNote.content === '') {
        return;
      }
      saveNote(activeNote);
    }, 1500);

    return () => clearTimeout(timer);
  }, [store.activeTabs, store.currentTabId]);

  useEffect(() => {
    fetchNotes();
    fetchCategories();
    fetchSettings();
  }, []);

  const fetchNotes = async (q = '') => {
    const url = q ? `${API_BASE}/notes/search?q=${encodeURIComponent(q)}` : `${API_BASE}/notes`;
    const res = await fetch(url);
    const data = await res.json();
    store.setNotes(data);
  };

  const fetchCategories = async () => {
    const res = await fetch(`${API_BASE}/categories`);
    store.setCategories(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    store.setSettings(data);
    applyTheme(data);
    fetchStats();
  };

  const fetchStats = async () => {
    const res = await fetch(`${API_BASE}/stats`);
    store.setStats(await res.json());
  };

  const applyTheme = (settings: Record<string, string>) => {
    const mode = settings.theme_mode || 'dark';
    if (mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    if (mode === 'custom' && settings.theme_custom) {
      try {
        const custom = JSON.parse(settings.theme_custom);
        Object.entries(custom).forEach(([key, val]) => {
          document.documentElement.style.setProperty(key, val as string);
        });
      } catch (e) {}
    } else {
      document.documentElement.removeAttribute('style');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    fetchNotes(e.target.value);
  };

  const createNote = () => {
    const tempId = `temp-${Date.now()}`;
    const newNote: Note = {
      id: tempId,
      title: t('new_note'),
      content: '',
      category_id: null,
      is_mcp_enabled: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isDraft: true
    };
    store.openTab(newNote);
  };

  const saveNote = async (note: Note) => {
    if (note.isDraft) {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: note.title, content: note.content, category_id: note.category_id, is_mcp_enabled: note.is_mcp_enabled === 1 })
      });
      const savedNote = await res.json();
      store.updateTabId(note.id, savedNote);
    } else {
      await fetch(`${API_BASE}/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });
    }
    fetchNotes();
    fetchStats();
  };

  const deleteNote = async (id: number | string) => {
    if (typeof id === 'number') {
      await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    }
    store.closeTab(id);
    fetchNotes();
    fetchStats();
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory })
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantMsg = { role: 'assistant', content: '', toolCalls: [] as any[] };
      setChatHistory(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content') {
              assistantMsg.content += data.content;
              setChatHistory(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
            } else if (data.type === 'tool_calls') {
              assistantMsg.toolCalls = data.tool_calls;
              setChatHistory(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
            } else if (data.type === 'tool_result') {
              // Refresh data automatically
              fetchNotes();
              fetchCategories();
              fetchStats();
              fetchSettings();
            } else if (data.type === 'done') {
              break;
            }
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const activeNote = store.activeTabs.find(t => t.id === store.currentTabId);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-border flex flex-col shadow-sm z-10">
        <div className="p-6 font-black text-2xl border-b border-border text-foreground tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground"><FileText className="w-4 h-4"/></div>
          ShapeContext
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setView('notes')} className={`flex items-center w-full p-3 rounded-lg font-medium transition-colors ${view === 'notes' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}><FileText className="w-5 h-5 mr-3"/> {t('notes')}</button>
          <button onClick={() => setView('dashboard')} className={`flex items-center w-full p-3 rounded-lg font-medium transition-colors ${view === 'dashboard' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}><BarChart2 className="w-5 h-5 mr-3"/> {t('dashboard')}</button>
          <button onClick={() => setView('settings')} className={`flex items-center w-full p-3 rounded-lg font-medium transition-colors ${view === 'settings' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}`}><Settings className="w-5 h-5 mr-3"/> {t('settings')}</button>
        </nav>
        <div className="p-4 border-t border-border bg-sidebar">
          <button onClick={() => setChatOpen(!chatOpen)} className="flex items-center w-full p-3 rounded-lg bg-secondary text-secondary-foreground border border-border justify-center font-bold shadow-sm hover:bg-secondary/80 transition-colors">
            <MessageSquare className="w-5 h-5 mr-2"/> {t('assistant')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background">
        {view === 'notes' && (
          <div className="flex flex-1 overflow-hidden">
            {/* Notes List */}
            <div className="w-72 border-r border-border flex flex-col bg-card/50">
              <div className="p-4 border-b border-border flex flex-col gap-3">
                <button onClick={createNote} className="flex items-center justify-center w-full p-3 rounded-lg bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 transition-colors">
                  <Plus className="w-5 h-5 mr-2"/> {t('new_note')}
                </button>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground"/>
                  <input type="text" placeholder={t('search')} value={searchQuery} onChange={handleSearch} className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-background border border-border focus:ring-2 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {store.notes.length === 0 && !searchQuery ? (
                  <div className="text-center p-4 text-sm text-muted-foreground mt-4">{t('no_notes')}</div>
                ) : store.notes.map(n => (
                  <button key={n.id} onClick={() => store.openTab(n)} className="w-full text-left p-3 text-sm rounded-lg hover:bg-secondary transition-colors border border-transparent hover:border-border flex flex-col gap-1">
                    <span className="font-semibold text-foreground truncate">{n.title || t('untitled')} {n.isDraft && <span className="text-xs text-orange-500 ml-1">({t('draft')})</span>}</span>
                    <div className="text-xs text-muted-foreground">{n.category_name || t('no_category')}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-background">
              {/* Tabs */}
              <div className="flex bg-sidebar/30 overflow-x-auto border-b border-border pt-2 px-2 gap-1">
                {store.activeTabs.map(tab => (
                  <div key={tab.id} className={`flex items-center px-4 py-2 cursor-pointer border border-b-0 rounded-t-lg transition-colors max-w-[200px] ${store.currentTabId === tab.id ? 'bg-background border-border text-foreground font-semibold shadow-sm z-10' : 'bg-transparent border-transparent text-muted-foreground hover:bg-secondary'}`} onClick={() => store.setCurrentTab(tab.id)}>
                    <span className="mr-2 text-sm truncate">{tab.title || t('untitled')} {tab.isDraft && '*'}</span>
                    <button className="p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors ml-auto" onClick={(e) => { e.stopPropagation(); store.closeTab(tab.id); }}>
                      <X className="w-3 h-3"/>
                    </button>
                  </div>
                ))}
              </div>
              {/* Editor */}
              {activeNote ? (
                <div className="flex-1 flex flex-col p-6 bg-background">
                  <div className="flex items-center justify-between mb-6">
                    <input type="text" value={activeNote.title} onChange={e => store.updateActiveTabTitle(e.target.value)} className="text-3xl font-bold bg-transparent border-none outline-none flex-1 placeholder-gray-400" placeholder={t('note_title')} />
                    <div className="flex items-center gap-4 bg-sidebar p-2 rounded-lg border border-border">
                      <label className="flex items-center text-sm cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={activeNote.is_mcp_enabled === 1} onChange={e => {
                          const val = e.target.checked ? 1 : 0;
                          store.updateTab(activeNote.id, { is_mcp_enabled: val });
                        }} className="mr-2 accent-primary"/>
                        {t('available_mcp')}
                      </label>
                      <div className="h-4 w-px bg-border"></div>
                      <select value={activeNote.category_id || ''} onChange={e => {
                         const val = e.target.value ? parseInt(e.target.value) : null;
                         store.updateTab(activeNote.id, { category_id: val });
                      }} className="bg-transparent border-none text-sm outline-none cursor-pointer">
                        <option value="" className="bg-background text-foreground">{t('no_category')}</option>
                        {store.categories.map(c => <option key={c.id} value={c.id} className="bg-background text-foreground">{c.name}</option>)}
                      </select>
                      <div className="h-4 w-px bg-border"></div>
                      <button onClick={() => deleteNote(activeNote.id)} className="p-1 rounded text-gray-500 hover:text-red-500 transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                  </div>
                  <textarea value={activeNote.content} onChange={e => store.updateActiveTabContent(e.target.value)} className="flex-1 w-full bg-transparent border-none resize-none outline-none font-mono text-base text-foreground/90 leading-relaxed" placeholder={t('write_note_here')} />
                  <div className="text-xs text-muted-foreground mt-4 flex justify-end">
                    {activeNote.isDraft ? t('unsaved_draft') : t('autosave_active')}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">{t('no_notes_open')}</p>
                  <p className="text-sm opacity-70">{t('select_or_create_note')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="p-8 max-w-2xl mx-auto w-full overflow-y-auto">
            <h2 className="text-3xl font-bold mb-8">{t('settings')}</h2>
            <div className="space-y-6">
              
              {/* IA CONFIG */}
              <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center"><MessageSquare className="w-5 h-5 mr-2"/> {t('ai_configuration')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">{t('openai_api_key')}</label>
                    <input type="password" value={store.settings.ai_api_key || ''} onChange={e => store.setSettings({ ...store.settings, ai_api_key: e.target.value })} className="w-full p-2.5 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">{t('model')}</label>
                    <input type="text" value={store.settings.ai_model || ''} onChange={e => store.setSettings({ ...store.settings, ai_model: e.target.value })} className="w-full p-2.5 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">{t('base_url')}</label>
                    <input type="text" value={store.settings.ai_base_url || ''} onChange={e => store.setSettings({ ...store.settings, ai_base_url: e.target.value })} className="w-full p-2.5 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="https://api.openai.com/v1" />
                  </div>
                </div>
              </div>

              {/* ASPECTO / TEMA */}
              <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center"><Settings className="w-5 h-5 mr-2"/> {t('appearance')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">{t('theme')}</label>
                    <select value={store.settings.theme_mode || 'dark'} onChange={e => {
                      const newSettings = { ...store.settings, theme_mode: e.target.value };
                      store.setSettings(newSettings);
                      applyTheme(newSettings);
                    }} className="w-full p-2.5 rounded-md bg-background border border-border outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                      <option value="light" className="bg-background text-foreground">{t('light')}</option>
                      <option value="dark" className="bg-background text-foreground">{t('dark')}</option>
                      <option value="custom" className="bg-background text-foreground">{t('custom_theme')}</option>
                    </select>
                  </div>
                  
                  {store.settings.theme_mode === 'custom' && (
                    <div className="p-4 bg-background border border-border rounded-lg space-y-3 mt-4">
                      <h4 className="text-sm font-bold mb-2">{t('custom_colors')}</h4>
                      {['--background', '--foreground', '--primary', '--sidebar', '--card'].map(cssVar => {
                        let customVals = {};
                        try { customVals = JSON.parse(store.settings.theme_custom || '{}'); } catch(e){}
                        const currentColor = customVals[cssVar as keyof typeof customVals] || '#000000';
                        return (
                          <div key={cssVar} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground font-mono">{cssVar}</span>
                            <div className="flex items-center gap-2">
                              <input type="color" value={currentColor} onChange={e => {
                                const newCustom = { ...customVals, [cssVar]: e.target.value };
                                const newSettings = { ...store.settings, theme_custom: JSON.stringify(newCustom) };
                                store.setSettings(newSettings);
                                applyTheme(newSettings);
                              }} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                              <span className="text-xs font-mono uppercase text-muted-foreground w-16">{currentColor}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground mt-4">{t('language')}</label>
                    <select value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)} className="w-full p-2.5 rounded-md bg-background border border-border outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                      <option value="es" className="bg-background text-foreground">Español</option>
                      <option value="en" className="bg-background text-foreground">English</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DATA MANAGEMENT */}
              <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center"><FileText className="w-5 h-5 mr-2"/> {t('import_export')}</h3>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-md cursor-pointer transition-colors border border-border">
                    <Plus className="w-4 h-4" /> {t('import_txt')}
                    <input type="file" multiple accept=".txt" className="hidden" onChange={async (e) => {
                      if (!e.target.files) return;
                      for (const file of Array.from(e.target.files)) {
                        const text = await file.text();
                        await fetch(`${API_BASE}/notes`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: file.name.replace('.txt', ''), content: text, is_mcp_enabled: false })
                        });
                      }
                      fetchNotes();
                      fetchStats();
                      alert(t('notes_imported'));
                    }} />
                  </label>
                  <button onClick={() => {
                    store.notes.forEach(note => {
                      const blob = new Blob([note.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${note.title || 'nota'}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                  }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-md transition-colors border border-border">
                    <Save className="w-4 h-4"/> {t('export_all')}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button onClick={() => {
                  fetch(`${API_BASE}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(store.settings)
                  });
                  alert(t('settings_saved'));
                }} className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-all">
                  {t('save_settings')}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'dashboard' && store.stats && (
          <div className="p-8 flex-1 overflow-auto">
            <h2 className="text-2xl font-bold mb-6">{t('dashboard')}</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="p-4 border border-border rounded bg-sidebar/50">
                 <h3 className="text-sm text-muted-foreground">{t('total_notes')}</h3>
                 <p className="text-3xl font-bold">{store.stats.totalNotes}</p>
               </div>
               <div className="p-4 border border-border rounded bg-sidebar/50">
                 <h3 className="text-sm text-muted-foreground">{t('mcp_notes')}</h3>
                 <p className="text-3xl font-bold">{store.stats.mcpNotes}</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 h-64">
              <div className="border border-border p-4 rounded bg-sidebar/50 flex flex-col">
                <h3 className="text-sm font-bold mb-4">{t('notes_by_category')}</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={store.stats.byCategory.map((c: any) => ({ name: c.name || t('no_category'), value: c.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                      {store.stats.byCategory.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="border border-border p-4 rounded bg-sidebar/50 flex flex-col">
                <h3 className="text-sm font-bold mb-4">{t('distribution')}</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={store.stats.byCategory.map((c: any) => ({ name: c.name || t('no_category'), value: c.count }))}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Panel */}
      {chatOpen && (
        <div className="w-96 border-l border-border bg-card flex flex-col shadow-2xl z-20 absolute right-0 top-0 bottom-0">
          <div className="p-4 border-b border-border flex justify-between items-center bg-sidebar">
            <span className="font-bold flex items-center text-lg"><MessageSquare className="w-5 h-5 mr-2 text-primary"/> {t('assistant')}</span>
            <button onClick={() => setChatOpen(false)} className="p-2 rounded-full hover:bg-secondary"><X className="w-5 h-5"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm bg-background/50">
            {chatHistory.length === 0 && <div className="text-center text-muted-foreground mt-10">{t('assistant_greeting')}</div>}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[90%] shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border border-border rounded-bl-none'}`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm dark:prose-invert">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.toolCalls?.map((tc: any, idx: number) => (
                        <div key={idx} className="mt-3 text-xs opacity-80 font-mono bg-background/50 p-2 rounded border border-border/50 flex items-center">
                          ✨ {t('executing_action')} {tc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && <div className="text-xs italic text-muted-foreground flex items-center gap-2"><div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div> {t('typing')}</div>}
          </div>
          <div className="p-4 border-t border-border bg-card">
            <div className="flex bg-background border border-border rounded-full p-1 focus-within:ring-2 focus-within:ring-primary shadow-sm">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} className="flex-1 px-4 py-2 text-sm bg-transparent outline-none" placeholder={t('ask_assistant')} />
              <button onClick={sendChatMessage} className="p-2 bg-primary text-primary-foreground rounded-full text-sm font-bold w-10 h-10 flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
