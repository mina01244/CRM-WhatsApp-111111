/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Uploader } from "./components/Uploader";
import { UserProfile } from "./components/UserProfile";
import { TemplateManager } from "./components/TemplateManager";
import { CustomerList } from "./components/CustomerList";
import { Auth } from "./components/Auth";
import { RawDataViewer } from "./components/RawDataViewer";
import { Customer, MessageTemplate } from "./types";
import { Send, Users, Clock, CheckCircle, LogOut, Database, Save, Loader2, Table } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, hasSupabaseKeys } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { cn } from "./lib/utils";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('crm_customers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('crm_templates');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "1",
        name: "Welcome Offer",
        content: "Hello [Name], welcome to our premium service. We have an exclusive 20% discount waiting for you!",
      },
    ];
  });
  const [syncing, setSyncing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [viewExcelOnly, setViewExcelOnly] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdvancedTabs, setShowAdvancedTabs] = useState(() => {
    const saved = localStorage.getItem("showAdvancedTabs");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastSavedData = useRef<string>("");

  const sqlQuery = `
-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS app_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  customers JSONB DEFAULT '[]'::jsonb,
  templates JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Users can view own state" ON app_state;
DROP POLICY IF EXISTS "Users can insert own state" ON app_state;
DROP POLICY IF EXISTS "Users can update own state" ON app_state;
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON app_state;

CREATE POLICY "Enable all actions for users based on user_id" 
ON app_state FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
  `.trim();

  useEffect(() => {
    if (!hasSupabaseKeys) {
      setLoadingAuth(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
      if (session) {
        loadData(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (event === 'SIGNED_IN') {
          setSession(prev => {
            if (prev?.user.id !== session.user.id) {
               loadData(session.user.id);
            }
            return session;
          });
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
        setCustomers([]);
        setDataLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("showAdvancedTabs", JSON.stringify(showAdvancedTabs));
  }, [showAdvancedTabs]);

  useEffect(() => {
    try {
      // Only update local storage if data actually exists to prevent overriding with empty initial state
      if (customers.length > 0 || templates.length > 0) {
        localStorage.setItem('crm_customers', JSON.stringify(customers));
        localStorage.setItem('crm_templates', JSON.stringify(templates));
      }
    } catch {}

    if (!session || !hasSupabaseKeys || !dataLoaded) return;
    
    const currentDataStr = JSON.stringify({ customers, templates });
    if (currentDataStr === lastSavedData.current) return;

    const timer = setTimeout(() => {
      saveData();
    }, 1500);

    return () => clearTimeout(timer);
  }, [customers, templates, session, dataLoaded]);

  const loadData = async (userId: string) => {
    try {
      setSyncing(true);
      const { data, error } = await supabase
        .from('app_state')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          setDataLoaded(true);
          return; // No rows found, normal for new users
        }
        if (error.code === '42P01' || error.code === 'PGRST204' || error.message?.toLowerCase().includes('does not exist') || error.message?.toLowerCase().includes('could not find')) {
          setShowSqlSetup(true);
        }
        setDataLoaded(true);
        return;
      }

      if (data) {
        setCustomers(data.customers || []);
        setTemplates(data.templates || []);
        lastSavedData.current = JSON.stringify({ customers: data.customers || [], templates: data.templates || [] });
      }
      setDataLoaded(true);
    } catch (error: any) {
      if (error?.code === '42P01' || error?.code === 'PGRST204' || error?.code === '42501' || error?.message?.toLowerCase().includes('does not exist') || error?.message?.toLowerCase().includes('could not find') || error?.message?.toLowerCase().includes('policy')) {
        setShowSqlSetup(true);
      } else {
        console.error('Error loading data', error);
      }
      setDataLoaded(true);
    } finally {
      setSyncing(false);
    }
  };

  const saveData = async () => {
    if (!session) return;
    
    const currentDataStr = JSON.stringify({ customers, templates });
    if (currentDataStr === lastSavedData.current) return;
    
    try {
      setSyncing(true);
      setSyncError(null);
      const { error } = await supabase
        .from('app_state')
        .upsert({ 
          user_id: session.user.id,
          customers,
          templates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
      if (error) throw error;
      lastSavedData.current = currentDataStr;
    } catch (error: any) {
      if (error?.code === '42P01' || error?.code === 'PGRST204' || error?.code === '42501' || error?.code === '23505' || error?.message?.toLowerCase().includes('does not exist') || error?.message?.toLowerCase().includes('could not find') || error?.message?.toLowerCase().includes('policy')) {
        setShowSqlSetup(true);
      } else {
        console.error('Error saving data', error);
        setSyncError(`Error ${error?.code || ''}: ${error?.message || 'Failed to save data to Supabase.'}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!hasSupabaseKeys) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
          <Database className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Setup Required</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Please connect your Supabase project by adding the following environment variables in the settings menu:
          </p>
          <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <code className="text-xs font-mono text-emerald-700 block mb-2 font-bold">VITE_SUPABASE_URL</code>
            <code className="text-xs font-mono text-emerald-700 block font-bold">VITE_SUPABASE_ANON_KEY</code>
          </div>
          <p className="text-xs text-slate-500">
            After adding these variables, the app will automatically reload.
          </p>
        </div>
      </div>
    );
  }

  if (loadingAuth) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  const totalCustomers = customers.length;
  const sentCustomers = customers.filter(c => c.status === "sent").length;
  const pendingCustomers = customers.filter(c => c.status === "pending" || !c.status).length;
  const completedCustomers = customers.filter(c => c.status === "completed").length;
  const canceledCustomers = customers.filter(c => c.status === "canceled").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200 overflow-x-hidden relative">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-20 relative shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800 tracking-tight hidden sm:block">WhatsApp CRM</span>
          {syncing && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div 
            onClick={() => {
              setShowProfile(!showProfile);
              if (viewExcelOnly && !showProfile) setViewExcelOnly(false);
            }}
            className={cn(
              "flex items-center gap-3 border px-3 py-1.5 rounded-full shadow-sm transition-all cursor-pointer",
              showProfile ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
            )}
          >
            <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold uppercase shadow-sm">
              {session.user.email?.charAt(0) || 'U'}
            </div>
            <span className={cn("text-sm font-bold hidden sm:block", showProfile ? "text-emerald-800" : "text-slate-700")}>
              {session.user.email}
            </span>
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSignOut();
              }}
              className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-8 sm:py-12 max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                W
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                WhatsApp Marketing CRM
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Upload your customer data, manage crafted message templates, and initiate direct WhatsApp conversations.
            </p>
          </motion.div>
          
          {!showProfile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <button
                onClick={() => setViewExcelOnly(!viewExcelOnly)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <Table className="w-4 h-4" />
                {viewExcelOnly ? "View CRM" : "View Excel Data"}
              </button>
              <Uploader onDataLoaded={(data) => {
                setCustomers(prev => [...prev, ...data]); // Append new data instead of replacing
              }} />
            </motion.div>
          )}
        </div>

        {showProfile ? (
          <UserProfile 
            session={session} 
            customers={customers} 
            setCustomers={setCustomers} 
            onClose={() => setShowProfile(false)} 
            showAdvancedTabs={showAdvancedTabs}
            setShowAdvancedTabs={setShowAdvancedTabs}
          />
        ) : (
          <>
            {totalCustomers > 0 && !viewExcelOnly && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 w-full"
          >
            <div className="flex justify-between items-end mb-1">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Campaign Progress</h2>
                <p className="text-xs text-slate-500 font-medium">Messages completed / total</p>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {Math.round((completedCustomers / totalCustomers) * 100) || 0}%
              </div>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
              <div 
                className="bg-amber-400 h-3 transition-all duration-500 ease-out" 
                style={{ width: `${(pendingCustomers / totalCustomers) * 100}%` }}
              ></div>
              <div 
                className="bg-emerald-400 h-3 transition-all duration-500 ease-out" 
                style={{ width: `${(sentCustomers / totalCustomers) * 100}%` }}
              ></div>
              <div 
                className="bg-blue-500 h-3 transition-all duration-500 ease-out" 
                style={{ width: `${(completedCustomers / totalCustomers) * 100}%` }}
              ></div>
              <div 
                className="bg-red-500 h-3 transition-all duration-500 ease-out" 
                style={{ width: `${(canceledCustomers / totalCustomers) * 100}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-slate-700">{totalCustomers}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Pending</span>
                <span className="text-sm font-bold text-amber-600">{pendingCustomers}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Announced</span>
                <span className="text-sm font-bold text-emerald-600">{sentCustomers}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Completed</span>
                <span className="text-sm font-bold text-blue-600">{completedCustomers}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Canceled</span>
                <span className="text-sm font-bold text-red-600">{canceledCustomers}</span>
              </div>
            </div>
          </motion.div>
        )}
        
        {viewExcelOnly ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <RawDataViewer customers={customers} />
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            <TemplateManager templates={templates} setTemplates={setTemplates} />
            <CustomerList 
              customers={customers} 
              templates={templates} 
              showAdvancedTabs={showAdvancedTabs}
              onUpdateStatus={(id, status) => {
                setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
              }}
            />
          </div>
        )}
        </>
        )}
      </main>

      {/* SQL Setup Modal */}
      <AnimatePresence>
        {showSqlSetup && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <Database className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800">إعداد قاعدة البيانات مطلوب (يظهر هذا الخطأ لأن الجدول غير موجود)</h3>
                  <p className="text-sm text-slate-500">لحل مشكلة حفظ البيانات، تحتاج إلى إنشاء جدول 'app_state' في Supabase لحفظ بياناتك.</p>
                </div>
              </div>
              <div className="p-6 overflow-y-auto" dir="rtl">
                <p className="text-sm text-slate-700 mb-4 font-bold">
                  الرجاء نسخ الكود التالي وتشغيله في محرر SQL (SQL Editor) داخل لوحة تحكم Supabase الخاصة بك:
                </p>
                <div className="bg-slate-900 rounded-xl p-4 relative group" dir="ltr">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(sqlQuery);
                      alert("تم النسخ!");
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors"
                  >
                    Copy SQL
                  </button>
                  <pre className="text-emerald-400 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {sqlQuery}
                  </pre>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3" dir="rtl">
                <button
                  onClick={() => setShowSqlSetup(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    setShowSqlSetup(false);
                    if (session) loadData(session.user.id);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                >
                  لقد قمت بتشغيل الكود، أعد المحاولة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sync Error Toast */}
      <AnimatePresence>
        {syncError && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50"
          >
            <div className="text-sm font-medium">{syncError}</div>
            <button onClick={() => setSyncError(null)} className="text-red-200 hover:text-white font-bold">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

