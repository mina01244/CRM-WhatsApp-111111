import React, { useState, useMemo } from "react";
import { Customer } from "../types";
import { Pin, ArrowLeft, ArrowRight, Settings2 } from "lucide-react";
import { cn } from "../lib/utils";

export function RawDataViewer({ customers }: { customers: Customer[] }) {
  // Extract all unique columns
  const allColumns = useMemo(() => {
    const cols = new Set<string>();
    cols.add("name");
    cols.add("phone");
    cols.add("amount");
    cols.add("sourceFile");
    customers.forEach(c => {
      Object.keys(c).forEach(k => {
        if (!['id', 'status'].includes(k)) {
          cols.add(k);
        }
      });
    });
    return Array.from(cols);
  }, [customers]);

  const [columnOrder, setColumnOrder] = useState<string[]>(allColumns);
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set(["name", "phone", "sourceFile"]));
  const [showSettings, setShowSettings] = useState(false);

  // Sync columnOrder if allColumns changes (e.g. new file uploaded)
  React.useEffect(() => {
    setColumnOrder(prev => {
      const newCols = allColumns.filter(c => !prev.includes(c));
      return [...prev.filter(c => allColumns.includes(c)), ...newCols];
    });
  }, [allColumns]);

  const togglePin = (col: string) => {
    const newPinned = new Set(pinnedColumns);
    if (newPinned.has(col)) {
      newPinned.delete(col);
    } else {
      newPinned.add(col);
    }
    setPinnedColumns(newPinned);
  };

  const moveColumn = (col: string, direction: 'left' | 'right') => {
    setColumnOrder(prev => {
      const idx = prev.indexOf(col);
      if (idx === -1) return prev;
      if (direction === 'left' && idx > 0) {
        const next = [...prev];
        next[idx] = next[idx - 1];
        next[idx - 1] = col;
        return next;
      }
      if (direction === 'right' && idx < prev.length - 1) {
        const next = [...prev];
        next[idx] = next[idx + 1];
        next[idx + 1] = col;
        return next;
      }
      return prev;
    });
  };

  // Separate pinned and unpinned for display
  const orderedPinned = columnOrder.filter(c => pinnedColumns.has(c));
  const orderedUnpinned = columnOrder.filter(c => !pinnedColumns.has(c));
  const finalDisplayOrder = [...orderedPinned, ...orderedUnpinned];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[700px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-800">Raw Excel Data View</h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={cn("px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2", showSettings ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
        >
          <Settings2 className="w-4 h-4" />
          Column Settings
        </button>
      </div>

      {showSettings && (
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Manage Columns</p>
          <div className="flex flex-wrap gap-2">
            {columnOrder.map(col => (
              <div key={col} className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 pr-2 shadow-sm">
                <button onClick={() => togglePin(col)} className={cn("p-1 rounded hover:bg-slate-100", pinnedColumns.has(col) ? "text-emerald-600" : "text-slate-400")}>
                  <Pin className="w-3 h-3" />
                </button>
                <span className="text-xs font-medium text-slate-700">{col}</span>
                <div className="flex items-center gap-0.5 ml-1 border-l border-slate-100 pl-1">
                  <button onClick={() => moveColumn(col, 'left')} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveColumn(col, 'right')} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-auto flex-1 relative" style={{ width: '100%' }}>
        <table className="w-full text-left border-collapse" style={{ minWidth: finalDisplayOrder.length * 150 }}>
          <thead className="bg-slate-50 sticky top-0 z-20">
            <tr>
              {finalDisplayOrder.map((col, idx) => {
                const isPinned = pinnedColumns.has(col);
                // Calculate left offset for pinned columns
                let leftOffset = 0;
                if (isPinned) {
                  for (let i = 0; i < idx; i++) {
                    leftOffset += 200; // Assuming fixed width for pinned columns to calculate offset, or we can just use CSS classes
                  }
                }
                
                return (
                  <th 
                    key={col} 
                    className={cn(
                      "px-6 py-3 text-xs font-bold uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap",
                      isPinned ? "sticky z-30 text-emerald-700 bg-emerald-50/90 backdrop-blur-sm shadow-[1px_0_0_0_#e2e8f0]" : "text-slate-500"
                    )}
                    style={isPinned ? { left: idx * 200, minWidth: 200, maxWidth: 200 } : { minWidth: 150 }}
                  >
                    <div className="flex justify-between items-center">
                      <span>{col}</span>
                      {isPinned && <Pin className="w-3 h-3" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {customers.map((c, rowIdx) => (
              <tr key={c.id || rowIdx} className="hover:bg-slate-50">
                {finalDisplayOrder.map((col, colIdx) => {
                  const isPinned = pinnedColumns.has(col);
                  return (
                    <td 
                      key={col} 
                      className={cn(
                        "px-6 py-3 text-sm border-r border-slate-100 truncate",
                        isPinned ? "sticky z-10 bg-emerald-50/30 backdrop-blur-sm shadow-[1px_0_0_0_#e2e8f0] font-medium text-slate-800" : "text-slate-600"
                      )}
                      style={isPinned ? { left: colIdx * 200, minWidth: 200, maxWidth: 200 } : { minWidth: 150 }}
                      title={String(c[col] || '')}
                    >
                      {String(c[col] || '')}
                    </td>
                  );
                })}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={finalDisplayOrder.length} className="px-6 py-12 text-center text-slate-400">
                  No data available. Upload an Excel file.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
