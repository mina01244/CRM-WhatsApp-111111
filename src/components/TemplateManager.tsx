import { useState, useEffect } from "react";
import { MessageTemplate } from "../types";
import { Plus, Trash2, Edit2, MessageSquareText } from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import { logActivity } from "../lib/supabase";

export function TemplateManager({
  templates,
  setTemplates,
}: {
  templates: MessageTemplate[];
  setTemplates: (templates: MessageTemplate[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "" });

  const handleAddTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const added = [
      ...templates,
      {
        id: newId,
        ...newTemplate,
      },
    ];
    setTemplates(added);
    setNewTemplate({ name: "", content: "" });
    logActivity('TEMPLATE_ADDED', { templateId: newId, templateName: newTemplate.name });
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    logActivity('TEMPLATE_DELETED', { templateId: id });
  };

  return (
    <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-emerald-600" />
            Message Templates
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create pre-defined messages for quick outreach.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-[400px]">
          {templates.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-50 border border-slate-200 rounded-lg border-dashed">
              <MessageSquareText className="w-6 h-6 text-slate-300 mb-2" />
              <p className="text-slate-400 text-xs">No templates saved yet.</p>
            </div>
          ) : (
            templates.map((template) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={template.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors relative group"
              >
                <button
                  onClick={() => handleDelete(template.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded pr-8">
                    {template.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 line-clamp-3 italic">
                  "{template.content}"
                </p>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
          <div>
            <input
              type="text"
              value={newTemplate.name}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, name: e.target.value })
              }
              placeholder="Template Name (e.g., Welcome)"
              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all mb-2"
            />
            <textarea
              value={newTemplate.content}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, content: e.target.value })
              }
              placeholder="Message Content. Use [Name] for name and [Amount] for amount."
              rows={3}
              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>
          <button
            onClick={handleAddTemplate}
            disabled={!newTemplate.name || !newTemplate.content}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded text-xs font-bold shadow-sm flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Template
          </button>
        </div>
      </div>
    </div>
  );
}
