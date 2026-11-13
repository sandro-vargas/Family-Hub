'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Plus,
  Calendar,
  Hand,
  Trash2,
  Check,
  AlertCircle,
  UserCheck,
  FolderPlus,
  CalendarCheck2,
  Pencil,
  X,
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  StickyNote,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { VoiceInputButton } from '@/components/voice-input-button';
import { TodoItem, TodoPriority } from '@/types/family';

const PRIORITY_META: Record<
  TodoPriority,
  { label: string; badgeBg: string; badgeText: string; rank: number }
> = {
  high: {
    label: 'Hoch / Dringend',
    badgeBg: 'bg-rose-100 border-rose-200',
    badgeText: 'text-rose-800',
    rank: 3,
  },
  normal: {
    label: 'Normal',
    badgeBg: 'bg-[#5CA6CE]/15 border-[#5CA6CE]/30',
    badgeText: 'text-[#2d7ba4]',
    rank: 2,
  },
  low: {
    label: 'Niedrig',
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-600',
    rank: 1,
  },
};

export default function TodosPage() {
  const {
    members,
    todoCategories,
    addTodoCategory,
    todos,
    addTodo,
    updateTodo,
    toggleTodoCompleted,
    claimTodo,
    deleteTodo,
  } = useFamily();

  // Erwachsene Familienmitglieder für Zuweisung (Chiara übernimmt keine ToDos)
  const assignableMembers = members.filter((m) => m.role === 'adult');

  // Compact Quick-Add Form State
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [categorySlug, setCategorySlug] = useState<string>('kita');
  const [priority, setPriority] = useState<TodoPriority>('normal');
  const [assignedMemberId, setAssignedMemberId] = useState<string>('unassigned');
  const [dueDate, setDueDate] = useState<string>('');

  // Form State for Adding Custom Category
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#74956C');

  // Filter & Sort State
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority_deadline' | 'deadline_priority'>(
    'priority_deadline'
  );

  // Instant Undo Banner State
  const [lastCompletedTodo, setLastCompletedTodo] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline Assignee Popover State
  const [openAssigneePopoverId, setOpenAssigneePopoverId] = useState<string | null>(null);

  // Edit ToDo State
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPriority, setEditPriority] = useState<TodoPriority>('normal');
  const [editAssignedId, setEditAssignedId] = useState<string>('unassigned');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editCategorySlug, setEditCategorySlug] = useState<string>('family');

  useEffect(() => {
    const handleOutsideClick = () => setOpenAssigneePopoverId(null);
    if (openAssigneePopoverId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [openAssigneePopoverId]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleToggleTodo = (todo: TodoItem) => {
    const willBeCompleted = !todo.is_completed;
    toggleTodoCompleted(todo.id);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (willBeCompleted) {
      setLastCompletedTodo({ id: todo.id, title: todo.title });
      undoTimerRef.current = setTimeout(() => {
        setLastCompletedTodo(null);
      }, 8000);
    } else if (lastCompletedTodo?.id === todo.id) {
      setLastCompletedTodo(null);
    }
  };

  const handleUndoBanner = () => {
    if (!lastCompletedTodo) return;
    toggleTodoCompleted(lastCompletedTodo.id);
    setLastCompletedTodo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTodo({
      title: title.trim(),
      notes: notes.trim() || null,
      category_slug: categorySlug,
      priority,
      assigned_member_id: assignedMemberId === 'unassigned' ? null : assignedMemberId,
      due_date: dueDate || null,
    });

    setTitle('');
    setNotes('');
    setDueDate('');
    setShowNotesInput(false);
  };

  const handleStartEdit = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditNotes(todo.notes || '');
    setEditPriority(todo.priority);
    setEditAssignedId(todo.assigned_member_id || 'unassigned');
    setEditDueDate(todo.due_date || '');
    setEditCategorySlug(todo.category_slug);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    updateTodo(id, {
      title: editTitle.trim(),
      notes: editNotes.trim() || null,
      priority: editPriority,
      assigned_member_id: editAssignedId === 'unassigned' ? null : editAssignedId,
      due_date: editDueDate || null,
      category_slug: editCategorySlug,
    });
    setEditingTodoId(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const created = addTodoCategory(newCatName.trim(), newCatColor);
    setCategorySlug(created.slug);
    setNewCatName('');
    setShowNewCatForm(false);
  };

  const filteredTodos = todos
    .filter((t) => {
      if (filterCategory !== 'all' && t.category_slug !== filterCategory) return false;
      if (filterAssignee === 'unassigned' && t.assigned_member_id !== null) return false;
      if (
        filterAssignee !== 'all' &&
        filterAssignee !== 'unassigned' &&
        t.assigned_member_id !== filterAssignee
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;

      if (sortBy === 'deadline_priority') {
        if (a.due_date && b.due_date) {
          const cmp = a.due_date.localeCompare(b.due_date);
          if (cmp !== 0) return cmp;
        } else if (a.due_date) {
          return -1;
        } else if (b.due_date) {
          return 1;
        }
        return PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank;
      }

      const rankDiff = PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank;
      if (rankDiff !== 0) return rankDiff;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

  const openTodosCount = todos.filter((t) => !t.is_completed).length;
  const openUnassignedCount = todos.filter(
    (t) => !t.is_completed && !t.assigned_member_id
  ).length;

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-[#5CA6CE]" />
          <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
            Familien-ToDos ({openTodosCount} offen)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1">
            <Hand className="h-3.5 w-3.5" />
            {openUnassignedCount} offen für alle
          </span>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F4F7F5] hover:bg-slate-200/70 text-[#1E293B] text-xs font-bold border border-slate-200"
          >
            <CalendarCheck2 className="h-3.5 w-3.5 text-[#74956C]" />
            Im Kalender
          </Link>
        </div>
      </div>

      {/* Compact Top Quick-Add Form */}
      <form
        onSubmit={handleCreateTodo}
        className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/90 space-y-2"
      >
        {/* Row 1: Title + Voice + Quick Submit */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neues ToDo eingeben (z.B. Kita-Kleiderbox auffüllen)..."
            className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
          />
          <VoiceInputButton onTranscript={(t) => setTitle(t)} />
          <button
            type="submit"
            disabled={!title.trim()}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#74956C] hover:bg-[#618059] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-2xs transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>ToDo</span>
          </button>
        </div>

        {/* Row 2: Compact Inline Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={assignedMemberId}
            onChange={(e) => setAssignedMemberId(e.target.value)}
            title="Zuständigkeit"
            className="rounded-lg border border-slate-200 bg-[#F4F7F5] px-2.5 py-1.5 text-xs font-bold text-[#1E293B]"
          >
            <option value="unassigned">🙌 Offen für alle</option>
            {assignableMembers.map((m) => (
              <option key={m.id} value={m.id}>
                👤 {m.display_name}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            title="Priorität"
            className="rounded-lg border border-slate-200 bg-[#F4F7F5] px-2.5 py-1.5 text-xs font-bold text-[#1E293B]"
          >
            <option value="normal">⚡ Normal</option>
            <option value="high">🔥 Hoch</option>
            <option value="low">🌱 Niedrig</option>
          </select>

          <div className="inline-flex items-center gap-1">
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              title="Kategorie"
              className="rounded-lg border border-slate-200 bg-[#F4F7F5] px-2.5 py-1.5 text-xs font-bold text-[#1E293B]"
            >
              {todoCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCatForm(!showNewCatForm)}
              title="Neue Kategorie hinzufügen"
              className="p-1.5 rounded-lg border border-slate-200 bg-[#F4F7F5] hover:bg-slate-200/70 text-[#5CA6CE]"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-[#F4F7F5] px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-[#74956C]" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              title="Deadline (optional)"
              className="bg-transparent text-xs font-semibold text-[#1E293B] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNotesInput(!showNotesInput)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              showNotesInput || notes
                ? 'bg-[#5CA6CE]/15 border-[#5CA6CE]/40 text-[#2d7ba4]'
                : 'bg-[#F4F7F5] border-slate-200 text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span>+ Notiz</span>
          </button>
        </div>

        {/* Optional Single-Line Notes Input */}
        {showNotesInput && (
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notiz / Details (z.B. Grösse 98/104, Kellerregal links)..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#1E293B] placeholder:text-slate-400"
          />
        )}

        {/* Inline New Category Mini-Box */}
        {showNewCatForm && (
          <div className="p-2 rounded-xl bg-[#F4F7F5] border border-slate-200 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Neue Kategorie (z.B. Garten, Auto)..."
              className="flex-1 min-w-[140px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-[#1E293B]"
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-7 w-9 rounded cursor-pointer border border-slate-300"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-2.5 py-1 rounded-lg bg-[#74956C] text-white text-xs font-bold"
            >
              Speichern
            </button>
          </div>
        )}
      </form>

      {/* Instant Undo Banner when a ToDo was just completed */}
      {lastCompletedTodo && (
        <div className="bg-[#1E293B] text-white px-4 py-2.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="h-4 w-4 text-[#74956C] shrink-0" />
            <span className="truncate">
              <strong>„{lastCompletedTodo.title}“</strong> wurde als erledigt markiert.
            </span>
          </div>
          <button
            type="button"
            onClick={handleUndoBanner}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1E293B] font-extrabold text-xs shrink-0 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Rückgängig machen
          </button>
        </div>
      )}

      {/* Compact Filter & Sort Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/90 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterCategory === 'all'
                  ? 'bg-[#74956C] text-white'
                  : 'bg-[#F4F7F5] text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Alle ({todos.length})
            </button>
            {todoCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.slug)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  filterCategory === cat.slug
                    ? 'bg-[#1E293B] text-white'
                    : 'bg-[#F4F7F5] text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color_hex }}
                />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4F7F5] px-2.5 py-1 rounded-xl border border-slate-200">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#74956C]" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'priority_deadline' | 'deadline_priority')
              }
              className="bg-transparent text-xs font-extrabold text-[#1E293B] focus:outline-none cursor-pointer"
            >
              <option value="priority_deadline">1. Priorität → 2. Deadline</option>
              <option value="deadline_priority">1. Deadline → 2. Priorität</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">
            Zuständig:
          </span>
          <button
            type="button"
            onClick={() => setFilterAssignee('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              filterAssignee === 'all'
                ? 'bg-[#5CA6CE] text-white'
                : 'bg-[#F4F7F5] text-slate-600'
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setFilterAssignee('unassigned')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
              filterAssignee === 'unassigned'
                ? 'bg-[#5CA6CE] text-white'
                : 'bg-[#F4F7F5] text-slate-600'
            }`}
          >
            <Hand className="h-3 w-3" />
            Offen ({openUnassignedCount})
          </button>
          {assignableMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setFilterAssignee(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                filterAssignee === m.id
                  ? 'bg-[#5CA6CE] text-white'
                  : 'bg-[#F4F7F5] text-slate-600'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color_hex }}
              />
              {m.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* ToDo List */}
      <div className="space-y-2.5">
        {filteredTodos.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/90">
            <p className="text-sm font-bold text-slate-600">
              Keine ToDos in dieser Ansicht gefunden.
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const cat =
              todoCategories.find((c) => c.slug === todo.category_slug) ||
              todoCategories[0];
            const prio = PRIORITY_META[todo.priority] || PRIORITY_META.normal;
            const assignedMember = todo.assigned_member_id
              ? members.find((m) => m.id === todo.assigned_member_id)
              : null;
            const isEditing = editingTodoId === todo.id;
            const isAssigneePopoverOpen = openAssigneePopoverId === todo.id;

            if (isEditing) {
              return (
                <div
                  key={todo.id}
                  className="bg-white rounded-2xl p-4 shadow-md border-2 border-[#5CA6CE] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-[#2d7ba4]">
                      ToDo bearbeiten
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingTodoId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                        Titel
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#1E293B]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                          Zuständigkeit
                        </label>
                        <select
                          value={editAssignedId}
                          onChange={(e) => setEditAssignedId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-[#1E293B] bg-white"
                        >
                          <option value="unassigned">Offen für alle</option>
                          {assignableMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.display_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                          Priorität
                        </label>
                        <select
                          value={editPriority}
                          onChange={(e) =>
                            setEditPriority(e.target.value as TodoPriority)
                          }
                          className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-[#1E293B] bg-white"
                        >
                          <option value="high">🔥 Hoch / Dringend</option>
                          <option value="normal">⚡ Normal</option>
                          <option value="low">🌱 Niedrig</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                          Deadline
                        </label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-[#1E293B] bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                        Notiz
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Optionale Notiz..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-[#1E293B]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTodoId(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(todo.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Speichern
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const formattedDeadline = todo.due_date
              ? new Intl.DateTimeFormat('de-CH', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                }).format(new Date(`${todo.due_date}T12:00:00`))
              : null;

            return (
              <div
                key={todo.id}
                className={`bg-white rounded-2xl p-3.5 shadow-xs border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  todo.is_completed
                    ? 'border-slate-200 bg-slate-50/70'
                    : todo.priority === 'high'
                    ? 'border-l-4 border-l-rose-500 border-slate-200/90'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Anyone can mark as completed or uncheck */}
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(todo)}
                    className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      todo.is_completed
                        ? 'bg-[#74956C] text-white hover:bg-[#618059]'
                        : 'border-2 border-[#74956C] bg-white hover:bg-[#74956C]/15'
                    }`}
                    title={
                      todo.is_completed
                        ? 'Erledigung rückgängig machen'
                        : 'Als erledigt markieren (für alle möglich)'
                    }
                  >
                    {todo.is_completed && <Check className="h-4 w-4" />}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white uppercase"
                        style={{ backgroundColor: cat?.color_hex || '#74956C' }}
                      >
                        {cat?.name || todo.category_slug}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prio.badgeBg} ${prio.badgeText}`}
                      >
                        {prio.label}
                      </span>

                      {formattedDeadline && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Fällig: {formattedDeadline}
                        </span>
                      )}
                    </div>

                    <h3
                      className={`font-extrabold text-sm sm:text-base ${
                        todo.is_completed ? 'line-through text-slate-400' : 'text-[#1E293B]'
                      }`}
                    >
                      {todo.title}
                    </h3>

                    {todo.notes && (
                      <p
                        className={`text-xs ${
                          todo.is_completed ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        {todo.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* Clickable Assignee Badge with Inline Selector Popover */}
                      <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenAssigneePopoverId(
                              isAssigneePopoverOpen ? null : todo.id
                            )
                          }
                          title="Klicken, um zuständige Person zu wechseln"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            assignedMember
                              ? 'bg-[#74956C]/12 border-[#74956C]/30 text-[#4d6847] hover:bg-[#74956C]/20'
                              : 'bg-[#5CA6CE]/15 border-[#5CA6CE]/30 text-[#2d7ba4] hover:bg-[#5CA6CE]/25'
                          }`}
                        >
                          {assignedMember ? (
                            <>
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: assignedMember.color_hex }}
                              />
                              <UserCheck className="h-3 w-3" />
                              <span>{assignedMember.display_name}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              <span>Offen für alle</span>
                            </>
                          )}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </button>

                        {isAssigneePopoverOpen && (
                          <div className="absolute left-0 top-full mt-1 z-30 w-44 rounded-xl bg-white shadow-lg border border-slate-200 p-1 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                claimTodo(todo.id, null);
                                setOpenAssigneePopoverId(null);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-100 ${
                                !todo.assigned_member_id
                                  ? 'bg-[#5CA6CE]/15 text-[#2d7ba4]'
                                  : 'text-slate-700'
                              }`}
                            >
                              <Hand className="h-3.5 w-3.5 text-[#5CA6CE]" />
                              <span>Offen für alle</span>
                            </button>
                            {assignableMembers.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  claimTodo(todo.id, m.id);
                                  setOpenAssigneePopoverId(null);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-100 ${
                                  todo.assigned_member_id === m.id
                                    ? 'bg-[#74956C]/15 text-[#4d6847]'
                                    : 'text-slate-700'
                                }`}
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: m.color_hex }}
                                />
                                <span>{m.display_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <CreatorBadge memberId={todo.created_by_member_id} showName={false} />
                    </div>
                  </div>
                </div>

                {/* Right Actions: Complete / Undo / Edit / Delete */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {todo.is_completed ? (
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors"
                      title="Als wieder offen markieren"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Rückgängig
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold shadow-2xs transition-colors"
                      title="ToDo als erledigt markieren"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Erledigen
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartEdit(todo)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#5CA6CE] hover:bg-sky-50"
                    title="ToDo bearbeiten (Titel, Zuständigkeit, Priorität, Deadline, Notiz)"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="ToDo löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
