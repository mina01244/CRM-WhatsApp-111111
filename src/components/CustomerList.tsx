import { useState } from "react";
import { Customer, MessageTemplate } from "../types";
import { Send, Phone, User, Search, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { logActivity } from "../lib/supabase";

export function CustomerList({
  customers,
  templates,
  showAdvancedTabs,
  onUpdateStatus,
}: {
  customers: Customer[];
  templates: MessageTemplate[];
  showAdvancedTabs?: boolean;
  onUpdateStatus: (id: string, status: "pending" | "sent" | "completed" | "canceled") => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [templateIds, setTemplateIds] = useState<{ pending: string; sent: string; completed: string; canceled: string }>({ pending: "", sent: "", completed: "", canceled: "" });
  const [countryCode, setCountryCode] = useState("20");
  const [activeTab, setActiveTab] = useState<"pending" | "sent" | "completed" | "canceled">("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionCustomer, setActionCustomer] = useState<Customer | null>(null);

  // If advanced tabs are disabled, ensure we aren't stuck on them
  if (!showAdvancedTabs && (activeTab === "completed" || activeTab === "canceled")) {
    setActiveTab("pending");
  }
  const itemsPerPage = 50;

  const handleTabChange = (tab: "pending" | "sent" | "completed" | "canceled") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const filteredCustomers = customers.filter(
    (c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
      if (!matchesSearch) return false;

      if (activeTab === "pending") {
        return c.status === "pending" || !c.status;
      } else {
        return c.status === activeTab;
      }
    }
  );

  const paginatedCustomers = filteredCustomers.slice(0, currentPage * itemsPerPage);

  const handleSendWhatsApp = (customer: Customer) => {
    let text = "";
    const activeTemplateId = templateIds[activeTab];
    if (activeTemplateId) {
      const template = templates.find((t) => t.id === activeTemplateId);
      if (template) {
        text = template.content.replace(/\[Name\]|\[الاسم\]/gi, customer.name);
        if (customer.amount) {
          text = text.replace(/\[Amount\]|\[المبلغ\]/gi, String(customer.amount));
        }
      }
    }
    
    let cleanPhone = customer.phone.replace(/[^\d+]/g, "");
    
    // Format phone: if it starts with 0, replace 0 with country code
    if (cleanPhone.startsWith("0")) {
      cleanPhone = countryCode + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("+") && !cleanPhone.startsWith(countryCode) && cleanPhone.length <= 11) {
      cleanPhone = countryCode + cleanPhone;
    }
    
    // wa.me prefers digits only, so remove '+'
    cleanPhone = cleanPhone.replace("+", "");
    
    const url = `https://wa.me/${cleanPhone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
    onUpdateStatus(customer.id, "sent");
    logActivity('MESSAGE_SENT', { customerId: customer.id, phone: cleanPhone });
    
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("Popup blocked or failed to open", e);
    }
  };

  const pendingCount = customers.filter(c => c.status === "pending" || !c.status).length;
  const sentCount = customers.filter(c => c.status === "sent").length;
  const completedCount = customers.filter(c => c.status === "completed").length;
  const canceledCount = customers.filter(c => c.status === "canceled").length;

  if (customers.length === 0) {
    return (
      <section className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">No Customers Yet</h3>
        <p className="text-slate-500 max-w-sm">
          Please upload your Excel file from the button at the top to start managing and messaging your contacts.
        </p>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden w-full">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md w-full">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 text-slate-800 placeholder:text-slate-400"
            />
            <div className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <select
            value={templateIds[activeTab]}
            onChange={(e) => setTemplateIds(prev => ({ ...prev, [activeTab]: e.target.value }))}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="">No Template (Empty)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                Use: {t.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Code:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">+</span>
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.replace(/[^\d]/g, ""))}
                className="w-16 pl-5 pr-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 text-slate-800"
                placeholder="20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 overflow-x-auto whitespace-nowrap">
        <button
          className={cn(
            "px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "pending" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
          onClick={() => handleTabChange("pending")}
        >
          Pending (قيد الانتظار)
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600", activeTab === "pending" && "bg-emerald-100 text-emerald-700")}>
            {pendingCount}
          </span>
        </button>
        <button
          className={cn(
            "px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "sent" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
          onClick={() => handleTabChange("sent")}
        >
          تم إعلانه (Announced)
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600", activeTab === "sent" && "bg-emerald-100 text-emerald-700")}>
            {sentCount}
          </span>
        </button>
        {showAdvancedTabs && (
          <>
            <button
              className={cn(
                "px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                activeTab === "completed" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
              onClick={() => handleTabChange("completed")}
            >
              Completed (مكتمل)
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600", activeTab === "completed" && "bg-emerald-100 text-emerald-700")}>
                {completedCount}
              </span>
            </button>
            <button
              className={cn(
                "px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                activeTab === "canceled" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
              onClick={() => handleTabChange("canceled")}
            >
              Canceled (ملغي)
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600", activeTab === "canceled" && "bg-emerald-100 text-emerald-700")}>
                {canceledCount}
              </span>
            </button>
          </>
        )}
      </div>
      <div className="flex-1 overflow-auto max-h-[600px]">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr className="border-b border-slate-200">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white relative">
              {paginatedCustomers.map((customer, i) => (
                <tr
                  key={customer.id}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {customer.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">
                    {customer.amount ? (
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {customer.amount}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {customer.status === "completed" ? (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                        مكتمل
                      </span>
                    ) : customer.status === "canceled" ? (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                        ملغي
                      </span>
                    ) : customer.status === "sent" ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                        تم إعلانه
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                        قيد الانتظار
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {activeTab === "pending" && (
                      <button
                        onClick={() => handleSendWhatsApp(customer)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm opacity-90 group-hover:opacity-100 bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Send className="w-3 h-3" />
                        WhatsApp
                      </button>
                    )}
                    {activeTab === "sent" && (
                      <button
                        onClick={() => setActionCustomer(customer)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm opacity-90 group-hover:opacity-100 bg-slate-800 hover:bg-slate-900 text-white"
                      >
                        <ExternalLink className="w-3 h-3" />
                        إجراء (Action)
                      </button>
                    )}
                    {(activeTab === "completed" || activeTab === "canceled") && (
                       <span className="text-xs font-medium text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-slate-400 text-sm">No customers found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {filteredCustomers.length > paginatedCustomers.length && (
          <div className="flex justify-center p-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Load More ({filteredCustomers.length - paginatedCustomers.length} remaining)
            </button>
          </div>
        )}
      </div>

      {actionCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActionCustomer(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">تفاصيل العميل (Customer Details)</h3>
              <button onClick={() => setActionCustomer(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">&times;</button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</span>
                  <span className="font-bold text-slate-800">{actionCustomer.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                  <span className="font-mono text-sm text-slate-700">{actionCustomer.phone}</span>
                </div>
                {actionCustomer.amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{actionCustomer.amount}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-white flex gap-3 justify-end border-t border-slate-100">
              <button
                onClick={() => {
                  onUpdateStatus(actionCustomer.id, "canceled");
                  setActionCustomer(null);
                }}
                className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors border border-red-200"
              >
                Cancel (ملغي)
              </button>
              <button
                onClick={() => {
                  onUpdateStatus(actionCustomer.id, "completed");
                  setActionCustomer(null);
                }}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-500/20"
              >
                Approved (مكتمل)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}
