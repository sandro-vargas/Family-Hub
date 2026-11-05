'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Plus,
  Calendar,
  Tag,
  Hand,
  Trash2,
  Check,
  AlertCircle,
  Users,
  UserCheck,
  FolderPlus,
  CalendarCheck2,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { VoiceInputButton } from '@/components/voice-input-button';
import { TodoPriority } from '@/types/family';

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
    activeMember,
    todoCategories,
    addTodoCategory,
    todos,
    addTodo,
    toggleTodoCompleted,
    claimTodo,
    deleteTodo,
  } = useFamily();

  const selectableMembers = members.filter((m) => m.role !== 'kiosk');
  // Für ToDos können nur erwachsene Familienmitglieder ausgewählt werden (Tochter Chiara übernimmt keine ToDos)
  const assignableMembers = members.filter((m) => m.role === 'adult');

  // Form State for New ToDo
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>('kita');
  const [priority, setPriority] = useState<TodoPriority>('normal');
  const [assignedMemberId, setAssignedMemberId] = useState<string>('unassigned'); // 'unassigned' = Offen für alle
  const [dueDate, setDueDate] = useState<string>('');

  // Form State for Adding Custom Category
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#74956C');

  // Filter State
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all'); // 'all' | 'unassigned' | memberId

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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#74956C]/15 text-[#74956C]">
            AUFGABEN & DEADLINES
          </span>
          <h1 className="text-2xl font-extrabold text-[#1E293B] mt-1 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-[#5CA6CE]" />
            Familien-ToDos ({openTodosCount} offen)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Aufgaben einer Person zuweisen oder als <strong>„Offen für alle“</strong> erfassen – Deadlines erscheinen automatisch im Familienkalender!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
            <Hand className="h-3.5 w-3.5" />
            {openUnassignedCount} ToDos offen zum Übernehmen
          </span>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4F7F5] hover:bg-slate-200/70 text-[#1E293B] text-xs font-bold border border-slate-200"
          >
            <CalendarCheck2 className="h-4 w-4 text-[#74956C]" />
            Deadlines im Kalender
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Create New ToDo + Manage Categories */}
        <div className="lg:col-span-5 space-y-5 h-fit">
          <form
            onSubmit={handleCreateTodo}
            className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4"
          >
            <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#74956C]" />
              Neues Familien-ToDo erfassen
            </h2>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Aufgabe / ToDo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Kita-Kleiderbox auffüllen, Steuererklärung..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
                />
                <VoiceInputButton onTranscript={(t) => setTitle(t)} />
              </div>
            </div>

            {/* Category Selection + Add New Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-[#74956C]" />
                  Kategorie
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCatForm(!showNewCatForm)}
                  className="text-xs font-bold text-[#5CA6CE] hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  + Neue Kategorie
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {todoCategories.map((cat) => {
                  const isSelected = categorySlug === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategorySlug(cat.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1E293B] text-white border-[#1E293B] shadow-2xs'
                          : 'bg-[#F4F7F5] text-slate-700 border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color_hex }}
                      />
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {showNewCatForm && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-[#1E293B] block">
                    Eigene ToDo-Kategorie hinzufügen (z.B. Garten, Auto, Ferien)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Kategorie-Name..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-[#1E293B]"
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
                      className="px-3 py-1.5 rounded-lg bg-[#74956C] text-white text-xs font-bold"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assignment: Specific Member OR Independent ("Offen für alle") */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[#5CA6CE]" />
                Zuständigkeit (Person oder unabhängig für alle)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignedMemberId('unassigned')}
                  className={`col-span-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    assignedMemberId === 'unassigned'
                      ? 'bg-[#5CA6CE] text-white border-[#5CA6CE] shadow-2xs'
                      : 'bg-[#F4F7F5] text-slate-700 border-slate-200'
                  }`}
                >
                  <Hand className="h-3.5 w-3.5" />
                  Unabhängig / Offen für alle (Jeder kann übernehmen)
                </button>

                {assignableMembers.map((m) => {
                  const isSel = assignedMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAssignedMemberId(m.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[#74956C] text-white border-[#74956C] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: m.color_hex }}
                      />
                      <span className="truncate">An {m.display_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Priorität
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TodoPriority)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-[#1E293B] bg-white"
                >
                  <option value="high">🔥 Hoch / Dringend</option>
                  <option value="normal">⚡ Normal</option>
                  <option value="low">🌱 Niedrig</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#74956C]" />
                  Deadline (erscheint im Kalender)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#1E293B]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Notiz / Details (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Grösse 98/104, im Kellerregal links..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-[#1E293B] placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-sm shadow-xs transition-colors"
            >
              ToDo speichern {dueDate ? '& Deadline im Kalender eintragen' : ''}
            </button>
          </form>
        </div>

        {/* Right 7 Columns: Filter Bar & ToDo List */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 space-y-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">
                Kategorie:
              </span>
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
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

            {/* Assignee Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
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
                Offen für alle ({openUnassignedCount})
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

          {/* ToDo Items */}
          <div className="space-y-3">
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
                    className={`bg-white rounded-2xl p-4 shadow-xs border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      todo.is_completed
                        ? 'border-slate-200 opacity-60'
                        : todo.priority === 'high'
                        ? 'border-l-4 border-l-rose-500 border-slate-200/90'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTodoCompleted(todo.id)}
                        className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          todo.is_completed
                            ? 'bg-[#74956C] text-white'
                            : 'border-2 border-[#74956C] bg-white hover:bg-[#74956C]/10'
                        }`}
                        title={todo.is_completed ? 'Als offen markieren' : 'Abhaken'}
                      >
                        {todo.is_completed && <Check className="h-4 w-4" />}
                      </button>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Category Badge */}
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white uppercase"
                            style={{ backgroundColor: cat?.color_hex || '#74956C' }}
                          >
                            {cat?.name || todo.category_slug}
                          </span>

                          {/* Priority Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prio.badgeBg} ${prio.badgeText}`}
                          >
                            {prio.label}
                          </span>

                          {/* Deadline Badge (linked with Calendar) */}
                          {formattedDeadline && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Deadline: {formattedDeadline} (im Kalender)
                            </span>
                          )}
                        </div>

                        <h3
                          className={`font-extrabold text-sm sm:text-base text-[#1E293B] ${
                            todo.is_completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {todo.title}
                        </h3>

                        {todo.notes && (
                          <p className="text-xs text-slate-600">{todo.notes}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {assignedMember ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#74956C]/12 text-[#4d6847] text-xs font-bold">
                              <UserCheck className="h-3.5 w-3.5" />
                              Zugewiesen an: {assignedMember.display_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#5CA6CE]/15 text-[#2d7ba4] text-xs font-bold">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Offen für alle (Jeder kann übernehmen)
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">Erfasst von:</span>
                          <CreatorBadge memberId={todo.created_by_member_id} showName={false} />
                        </div>
                      </div>
                    </div>

                    {/* Right Actions: Claim / Unassign + Delete */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!todo.is_completed && !todo.assigned_member_id && activeMember.role === 'adult' && (
                        <button
                          type="button"
                          onClick={() => claimTodo(todo.id, activeMember.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] text-white text-xs font-bold shadow-2xs transition-colors"
                          title={`Als ${activeMember.display_name} übernehmen`}
                        >
                          <Hand className="h-3.5 w-3.5" />
                          Ich übernehme ({activeMember.short_code})
                        </button>
                      )}

                      {!todo.is_completed && todo.assigned_member_id && (
                        <button
                          type="button"
                          onClick={() => claimTodo(todo.id, null)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F4F7F5] hover:bg-slate-200 text-slate-600 text-[11px] font-bold"
                          title="Zuweisung aufheben (wieder offen für alle machen)"
                        >
                          Freigeben
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteTodo(todo.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
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
      </div>
    </div>
  );
}

