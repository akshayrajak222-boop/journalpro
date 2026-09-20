import React, { useState } from 'react';
import { 
  Search, Plus, FileText, Star, Archive, Trash2, Folder, 
  Tag, ChevronLeft, Calendar as CalendarIcon, Copy, Download, 
  Share2, Type, Bold, Italic, Underline, Strikethrough, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, 
  Quote, Code, Link, Image as ImageIcon, CheckCircle,
  X, File, CalendarDays, BarChart2, BookOpen
} from 'lucide-react';
import { Note, Trade } from '../types';

interface NotebookTabProps {
  notes: Note[];
  handleCreateNote: (note: Note) => Promise<void>;
  handleUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  handleDeleteNote: (id: string) => Promise<void>;
  activeNoteId: string | null;
  setActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  trades: Trade[];
}

export function NotebookTab({ notes, handleCreateNote, handleUpdateNote, handleDeleteNote, activeNoteId, setActiveNoteId, trades }: NotebookTabProps) {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isLinkTradeModalOpen, setIsLinkTradeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites' | 'archived' | 'trash'>('all');
  const [activeFolder, setActiveFolder] = useState<string | null>('Daily Journal');
  
  // Calendar state for template modal
  const [templateMonthDate, setTemplateMonthDate] = useState<Date>(new Date());
  const [selectedTemplateDate, setSelectedTemplateDate] = useState<Date>(new Date());
  
  const folders = ['Daily Journal'];
  const tags = ['setup', 'psychology', 'review'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday.
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // adjust for starting on Monday
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    // Prev month days
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    // Next month days
    let nextMonthDay = 1;
    while (days.length < 42) {
      days.push({ day: nextMonthDay++, isCurrentMonth: false, date: new Date(year, month + 1, nextMonthDay - 1) });
    }
    return days;
  };

  const createNote = (templateTitle: string = 'New Note', dateOverride?: Date) => {
    const noteDate = dateOverride || new Date();
    const newNote: Note = {
      id: Date.now().toString(),
      title: `${noteDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
      content: '',
      date: noteDate.toISOString(),
      folder: activeFolder || 'Daily Journal',
      isFavorite: false,
      isArchived: false,
      isTrash: false,
    };

    if (templateTitle === 'Pre-Market Plan') {
      newNote.content = `# Pre-Market Plan\n\n**Market Bias:**\n- EURUSD: \n- XAUUSD: \n\n**Key Levels to Watch:**\n1. \n2. \n3. \n\n**Mental State Check (1-10):** `;
    } else if (templateTitle === 'Daily Review') {
      newNote.content = `# Daily Review\n\n**Total Trades:** \n**P/L:** \n\n**What went well today?**\n- \n\n**What mistakes did I make?**\n- \n\n**Did I follow my plan perfectly? (Yes/No - Explain)**\n- `;
    } else if (templateTitle === 'Missed Trade Analysis') {
      newNote.content = `# Missed Trade Analysis\n\n**Symbol:** \n**Direction:** \n**Time Missed:** \n\n**Why did I miss it?**\n- Hesitation\n- Not at desk\n- Setup wasn't clear at the time\n\n**Did it hit TP/SL?**\n- \n\n**Lesson for next time:**\n- `;
    } else if (templateTitle === 'Weekly Review') {
      newNote.content = `# Weekly Review\n\n**Total Trades:** \n**Win Rate:** \n**Net P/L:** \n\n**Biggest Winner:** \n**Biggest Loser:** \n\n**Review of Goals from last week:**\n- \n\n**Goals for next week:**\n1. \n2. `;
    }

    handleCreateNote(newNote);
    setActiveNoteId(newNote.id);
    setIsTemplateModalOpen(false);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  const filteredNotes = notes.filter(n => {
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeCategory === 'favorites' && !n.isFavorite) return false;
    if (activeCategory === 'archived' && !n.isArchived) return false;
    if (activeCategory === 'trash' && !n.isTrash) return false;
    if (activeCategory === 'all' && (n.isArchived || n.isTrash)) return false;
    if (activeFolder && n.folder !== activeFolder && activeCategory === 'all') return false;
    return true;
  });

  return (
    <div className="h-full flex overflow-hidden rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#060913]">
      
      {/* 1. inner sidebar */}
      {!activeNoteId && (
        <div className="w-64 border-r border-slate-200 dark:border-white/5 flex flex-col bg-slate-50 dark:bg-[#0a0d16]">
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#14151a] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            
            <button 
              onClick={() => setIsTemplateModalOpen(true)}
              className="w-full flex items-center justify-between bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New</span>
              </div>
              <ChevronLeft className="w-4 h-4 rotate-270" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <button 
              onClick={() => { setActiveCategory('all'); setActiveFolder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'all' && !activeFolder ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
            >
              <FileText className="w-4 h-4" /> All notes
            </button>
            <button 
              onClick={() => { setActiveCategory('favorites'); setActiveFolder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'favorites' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
            >
              <Star className="w-4 h-4" /> Favourites
            </button>
            <button 
              onClick={() => { setActiveCategory('archived'); setActiveFolder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'archived' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
            >
              <Archive className="w-4 h-4" /> Archived
            </button>
            <button 
              onClick={() => { setActiveCategory('trash'); setActiveFolder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'trash' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
            >
              <Trash2 className="w-4 h-4" /> Trash
            </button>

            <div className="pt-4 pb-1 px-3 text-xs font-bold text-slate-400 tracking-wider">FOLDERS</div>
            {folders.map(folder => (
              <button 
                key={folder}
                onClick={() => { setActiveFolder(folder); setActiveCategory('all'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeFolder === folder ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4 h-4" /> {folder}
                </div>
                <span className="text-xs text-slate-400">{notes.filter(n => n.folder === folder).length}</span>
              </button>
            ))}

            <div className="pt-4 pb-1 px-3 text-xs font-bold text-slate-400 tracking-wider">TAGS</div>
            {tags.map(tag => (
              <button 
                key={tag}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
              >
                <Tag className="w-3.5 h-3.5" /> {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Content Area */}
      {!activeNoteId ? (
        <div className="flex-1 bg-white dark:bg-[#14151a] p-8 overflow-y-auto relative">
          <div className="mb-6 uppercase text-xs font-bold text-slate-500 tracking-widest">
            {activeFolder ? activeFolder : (activeCategory === 'all' ? 'All Notes' : activeCategory)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className="group cursor-pointer bg-slate-50 dark:bg-[#1e1f24] border border-slate-200 dark:border-white/5 rounded-xl p-5 hover:border-amber-500/50 transition-colors shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{note.title}</h3>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateNote(note.id, { isFavorite: !note.isFavorite });
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${note.isFavorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/50 dark:hover:bg-white/10'}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateNote(note.id, { isArchived: !note.isArchived });
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${note.isArchived ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-white/10'}`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-3 min-h-[60px]">
                  {note.content || "Empty note..."}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                    {new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5" />
                    {note.folder}
                  </div>
                </div>
              </div>
            ))}

            {filteredNotes.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No notes found</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Click 'New' to start journaling.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. Editor View */
        <div className="flex-1 flex flex-col bg-white dark:bg-[#14151a]">
          {/* Editor Header */}
          <div className="h-14 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 bg-slate-50/50 dark:bg-black/20">
            <button 
              onClick={() => setActiveNoteId(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> All notes
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"><Share2 className="w-4 h-4" /></button>
              <button 
                onClick={() => {
                  handleDeleteNote(activeNoteId!);
                }}
                className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
              
              {/* Meta bar */}
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <Folder className="w-3.5 h-3.5 text-slate-400" /> {activeNote.folder}
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> {new Date(activeNote.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                </button>
                <div className="relative">
                  {activeNote.linkedTradeId ? (
                    <div className="flex items-center">
                      <button 
                        onClick={() => setIsLinkTradeModalOpen(!isLinkTradeModalOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-l-md border border-r-0 border-slate-200 dark:border-white/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-400/10 transition-colors"
                      >
                        <Link className="w-3.5 h-3.5" /> Linked to {trades.find(t => t.id === activeNote.linkedTradeId)?.symbol || 'Trade'}
                      </button>
                      <button 
                        onClick={() => {
                          handleUpdateNote(activeNote.id, { linkedTradeId: undefined });
                        }}
                        className="px-2 py-1.5 rounded-r-md border border-slate-200 dark:border-white/10 text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Unlink trade"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsLinkTradeModalOpen(!isLinkTradeModalOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/10 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" /> Link a trade
                    </button>
                  )}

                  {isLinkTradeModalOpen && (
                    <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-[#1e1f24] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-10 max-h-80 flex flex-col overflow-hidden">
                      <div className="p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#14151a]">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Trade to Link</h4>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {trades.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">No trades available.</div>
                        ) : (
                          trades.map(trade => (
                            <button
                              key={trade.id}
                              onClick={() => {
                                handleUpdateNote(activeNote.id, { linkedTradeId: trade.id });
                                setIsLinkTradeModalOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                            >
                              <div>
                                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                  {trade.symbol} 
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${trade.type === 'Buy' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                    {trade.type.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </div>
                              <div className={`font-bold text-sm ${trade.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {trade.profit >= 0 ? '+' : ''}{trade.profit}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Input */}
              <input 
                type="text" 
                defaultValue={activeNote.title}
                onBlur={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
                className="w-full bg-transparent text-4xl font-extrabold text-slate-900 dark:text-white focus:outline-none placeholder-slate-300 dark:placeholder-slate-700 font-display"
                placeholder="Note title..."
              />
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                <span>{activeNote.content.split(/\s+/).filter(w => w.length > 0).length} words</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Saved</span>
              </div>

              {/* Toolbar Mockup */}
              <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-[#1a1b20] border border-slate-200 dark:border-white/5 rounded-lg overflow-x-auto whitespace-nowrap scrollbar-hide text-slate-500 dark:text-slate-400">
                <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200"><Type className="w-3.5 h-3.5"/> Paragraph</button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Bold className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Italic className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Underline className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Strikethrough className="w-4 h-4"/></button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><List className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><ListOrdered className="w-4 h-4"/></button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><AlignLeft className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><AlignCenter className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><AlignRight className="w-4 h-4"/></button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Quote className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Code className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><Link className="w-4 h-4"/></button>
                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"><ImageIcon className="w-4 h-4"/></button>
              </div>

              {/* Editor Textarea */}
              <textarea 
                defaultValue={activeNote.content}
                onBlur={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                className="w-full min-h-[500px] bg-transparent text-slate-800 dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
                placeholder="Start typing..."
              ></textarea>

            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14151a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden animate-slide-down">
            
            <div className="flex-1 p-6 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0d16]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choose a template</h2>
                <button onClick={() => setIsTemplateModalOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                Day templates add to the selected day's note. The rest create a new note.
              </p>
              
              {/* Functional Calendar component */}
              <div className="bg-white dark:bg-[#14151a] border border-slate-200 dark:border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => setTemplateMonthDate(new Date(templateMonthDate.getFullYear(), templateMonthDate.getMonth() - 1, 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-white" />
                  </button>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {templateMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => setTemplateMonthDate(new Date(templateMonthDate.getFullYear(), templateMonthDate.getMonth() + 1, 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 hover:text-slate-600 dark:hover:text-white" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2">
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {getDaysInMonth(templateMonthDate).map((dayObj, i) => {
                    const isSelected = selectedTemplateDate.toDateString() === dayObj.date.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedTemplateDate(dayObj.date)}
                        className={`py-1.5 rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                          !dayObj.isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                        } ${isSelected ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold' : ''}`}
                      >
                        {dayObj.day}
                        {isSelected && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full"></div>}
                      </button>
                    )
                  })}
                </div>
                <button 
                  onClick={() => setSelectedTemplateDate(new Date())}
                  className="w-full mt-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 relative">
              <button onClick={() => setIsTemplateModalOpen(false)} className="hidden md:block absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5"/>
              </button>
              
              <div className="space-y-3 mt-8">
                <button 
                  onClick={() => createNote('Blank Note', selectedTemplateDate)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-amber-500/50 bg-white dark:bg-[#1a1b20] transition-colors flex items-center gap-4"
                >
                  <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg"><File className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Blank Note</h3>
                  </div>
                </button>

                <button 
                  onClick={() => createNote('Pre-Market Plan', selectedTemplateDate)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-amber-500/50 bg-white dark:bg-[#1a1b20] transition-colors flex items-center gap-4"
                >
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg"><CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-500" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Pre-Market Plan</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Adds to that day's note</p>
                  </div>
                </button>

                <button 
                  onClick={() => createNote('Daily Review', selectedTemplateDate)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-amber-500/50 bg-white dark:bg-[#1a1b20] transition-colors flex items-center gap-4"
                >
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"><BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Daily Review</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Adds to that day's note</p>
                  </div>
                </button>

                <button 
                  onClick={() => createNote('Missed Trade Analysis', selectedTemplateDate)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-amber-500/50 bg-white dark:bg-[#1a1b20] transition-colors flex items-center gap-4"
                >
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg"><BarChart2 className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Missed Trade Analysis</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Creates a note</p>
                  </div>
                </button>

                <button 
                  onClick={() => createNote('Weekly Review', selectedTemplateDate)}
                  className="w-full text-left p-4 rounded-xl border border-amber-500/50 bg-amber-50/50 dark:bg-amber-500/5 transition-colors flex items-center gap-4 shadow-sm"
                >
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg"><CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Weekly Review</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Creates a note</p>
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
