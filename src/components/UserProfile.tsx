import React, { useMemo, useState } from "react";
import { Customer } from "../types";
import { Session } from "@supabase/supabase-js";
import { motion } from "motion/react";
import { FileSpreadsheet, Trash2, Users, Database, Clock, Upload, Check, Pencil, DownloadCloud } from "lucide-react";
import { Uploader } from "./Uploader";

export function UserProfile({ 
  session, 
  customers, 
  setCustomers,
  onClose,
  showAdvancedTabs,
  setShowAdvancedTabs
}: { 
  session: Session; 
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  onClose: () => void;
  showAdvancedTabs: boolean;
  setShowAdvancedTabs: (v: boolean) => void;
}) {
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");

  // Group customers by sourceFile
  const files = useMemo(() => {
    const map = new Map<string, { count: number, pending: number, completed: number, unimported: number }>();
    
    customers.forEach(c => {
      const file = c.sourceFile || "Manual Entry / Unknown File";
      if (!map.has(file)) {
        map.set(file, { count: 0, pending: 0, completed: 0, unimported: 0 });
      }
      const data = map.get(file)!;
      data.count++;
      if (c.status === "completed" || c.status === "sent") data.completed++;
      else if (c.status === "unimported") data.unimported++;
      else data.pending++;
    });
    
    return Array.from(map.entries()).map(([name, stats]) => ({ name, ...stats }));
  }, [customers]);

  const handleDeleteFile = (fileName: string) => {
    if (confirm(`Are you sure you want to delete all data from "${fileName}"? This cannot be undone.`)) {
      setCustomers(prev => prev.filter(c => (c.sourceFile || "Manual Entry / Unknown File") !== fileName));
    }
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear ALL customer data? This cannot be undone.")) {
      setCustomers([]);
    }
  };

  const startEditing = (name: string) => {
    setEditingFile(name);
    setNewFileName(name);
  };

  const saveFileName = (oldName: string) => {
    if (!newFileName.trim() || newFileName === oldName) {
      setEditingFile(null);
      return;
    }
    setCustomers(prev => prev.map(c => 
      (c.sourceFile || "Manual Entry / Unknown File") === oldName 
        ? { ...c, sourceFile: newFileName.trim() } 
        : c
    ));
    setEditingFile(null);
  };

  const importFile = (fileName: string) => {
    setCustomers(prev => prev.map(c => 
      (c.sourceFile || "Manual Entry / Unknown File") === fileName && c.status === "unimported"
        ? { ...c, status: "pending" } 
        : c
    ));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      dir="rtl"
    >
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">الملف الشخصي وإدارة البيانات</h2>
          <p className="text-sm text-slate-500 mt-1">حسابك مرتبط بـ <span className="font-medium text-slate-700" dir="ltr">{session.user.email}</span></p>
        </div>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm shadow-sm"
        >
          العودة للتطبيق
        </button>
      </div>
      
      <div className="p-6">
        <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">إعدادات التطبيق</h3>
            <p className="text-sm text-slate-500">إظهار القوائم المتقدمة (مكتمل / ملغي)</p>
          </div>
          <button 
            onClick={() => setShowAdvancedTabs(!showAdvancedTabs)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAdvancedTabs ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAdvancedTabs ? '-translate-x-6' : '-translate-x-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-emerald-700">{customers.length}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-600">الملفات المرفوعة</p>
              <p className="text-2xl font-bold text-blue-700">{files.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
          <h3 className="text-lg font-bold text-slate-800">إدارة الملفات السابقة</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Uploader 
              buttonText="رفع ملف جديد (بدون استيراد)"
              buttonIcon={<DownloadCloud className="w-4 h-4" />}
              buttonClassName="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              onDataLoaded={(data) => {
                const unimportedData = data.map(c => ({ ...c, status: "unimported" as any }));
                setCustomers(prev => [...prev, ...unimportedData]);
              }} 
            />
            <button 
              onClick={handleClearAll}
              className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-100"
            >
              مسح جميع البيانات
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {files.map(f => (
            <div key={f.name} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-slate-100 rounded-xl hover:border-emerald-200 transition-colors bg-white gap-4 shadow-sm group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  {editingFile === f.name ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="border border-emerald-200 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-bold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveFileName(f.name);
                          if (e.key === "Escape") setEditingFile(null);
                        }}
                      />
                      <button onClick={() => saveFileName(f.name)} className="text-emerald-600 hover:text-emerald-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingFile(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-700">{f.name}</h4>
                      <button 
                        onClick={() => startEditing(f.name)}
                        className="text-slate-300 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {f.count} عميل</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {f.pending} قيد الانتظار</span>
                    {f.unimported > 0 && (
                       <span className="flex items-center gap-1 text-amber-600 font-bold"> غير مستورد ({f.unimported})</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {f.unimported > 0 && (
                  <button 
                    onClick={() => importFile(f.name)}
                    className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors font-bold"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    استيراد العملاء
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteFile(f.name)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الملف
                </button>
              </div>
            </div>
          ))}

          {files.length === 0 && (
            <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
              <p className="text-slate-500 font-medium">لم تقم برفع أي ملفات بعد.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
