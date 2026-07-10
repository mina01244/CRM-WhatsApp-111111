import React, { useState, useCallback, useMemo } from "react";
import { Upload, CheckCircle2, X, Table } from "lucide-react";
import * as XLSX from "xlsx";
import { Customer } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export function Uploader({
  onDataLoaded,
  buttonText = "Upload Data",
  buttonIcon,
  buttonClassName
}: {
  onDataLoaded: (data: Customer[]) => void;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  buttonClassName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [mappingData, setMappingData] = useState<{
    rawData: any[][];
    headerRowIndex: number;
    nameColIndex: number;
    phoneColIndex: number;
    amountColIndex: number;
    fileName: string;
  } | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setSuccess(false);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
      
      let headerRowIndex = -1;
      let nameColIndex = -1;
      let phoneColIndex = -1;
      let amountColIndex = -1;

      // Scan rows to find the header row
      for (let i = 0; i < Math.min(rawData.length, 100); i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;
        
        let foundName = -1;
        let foundPhone = -1;
        let foundAmount = -1;

        for (let j = 0; j < row.length; j++) {
          const s = String(row[j]).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "");
          if (!s) continue;

          if (s.includes("sendername") || s.includes("fullname") || s.includes("name") || s.includes("اسم") || s.includes("الاسم")) {
            if (foundName === -1) foundName = j;
          }
          if (s.includes("sendermobile") || s.includes("phonenumber") || s.includes("mobile") || s.includes("phone") || s.includes("رقم") || s.includes("جوال") || s.includes("هاتف")) {
            if (foundPhone === -1) foundPhone = j;
          }
          if (s.includes("amount") || s.includes("price") || s.includes("total") || s.includes("المبلغ") || s.includes("القيمة") || s.includes("السعر") || s.includes("الاجمالي")) {
            if (foundAmount === -1) foundAmount = j;
          }
        }

        if (foundName !== -1 || foundPhone !== -1) {
          headerRowIndex = i;
          nameColIndex = foundName;
          phoneColIndex = foundPhone;
          amountColIndex = foundAmount;
          // If we found both, break immediately
          if (foundName !== -1 && foundPhone !== -1) {
             break;
          }
        }
      }

      setMappingData({
        rawData,
        headerRowIndex: headerRowIndex !== -1 ? headerRowIndex : 0,
        nameColIndex,
        phoneColIndex,
        amountColIndex,
        fileName: file.name
      });

    } catch (error) {
      console.error("Error parsing Excel:", error);
      alert("Failed to parse the Excel file. Please make sure it's valid.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = ""; // Reset input
    }
  };

  const handleImport = () => {
    if (!mappingData) return;
    const { rawData, headerRowIndex, nameColIndex, phoneColIndex, amountColIndex, fileName } = mappingData;

    let customers: Customer[] = [];
    
    // Parse data below the header row
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      let name = nameColIndex !== -1 && row[nameColIndex] !== undefined ? String(row[nameColIndex]) : "";
      let phone = phoneColIndex !== -1 && row[phoneColIndex] !== undefined ? String(row[phoneColIndex]) : "";
      let amount = amountColIndex !== -1 && row[amountColIndex] !== undefined ? String(row[amountColIndex]) : "";
      
      phone = phone.replace(/[^\d+]/g, "");
      if (phone && phone.length >= 8) {
        const otherFields: Record<string, any> = {};
        if (headerRowIndex !== -1 && rawData[headerRowIndex]) {
          row.forEach((cell, idx) => {
            if (cell !== undefined && cell !== "") {
              let headerName = String(rawData[headerRowIndex][idx] || `Column_${idx + 1}`).trim();
              if (['id', 'name', 'phone', 'amount', 'status', 'sourceFile'].includes(headerName)) {
                headerName = headerName + " (Excel)";
              }
              otherFields[headerName] = cell;
            }
          });
        }

        customers.push({
          id: `cust_${i}_${Math.random().toString(36).substr(2, 5)}`,
          name: name.trim() || `Customer ${customers.length + 1}`,
          phone,
          amount: amount.trim(),
          status: "pending",
          sourceFile: fileName,
          ...otherFields
        });
      }
    }

    if (customers.length > 0) {
      onDataLoaded(customers);
      setSuccess(true);
      setMappingData(null);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert("No valid phone numbers found in the Excel file. Please check the Phone Column mapping.");
    }
  };

  const maxCols = useMemo(() => {
    if (!mappingData) return 0;
    return Math.max(...mappingData.rawData.map(row => row.length));
  }, [mappingData]);

  return (
    <>
      <div className="relative inline-flex group">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          title="Upload Excel File"
        />
        <button
          className={cn(
            buttonClassName || "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm",
            !buttonClassName ? (success
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-emerald-600 hover:bg-emerald-700 text-white") : ""
          )}
        >
          {success ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            buttonIcon || <Upload className="w-4 h-4" />
          )}
          <span>
            {success
              ? "Data Imported!"
              : loading
              ? "Processing..."
              : buttonText}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {mappingData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <Table className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-800">تعيين بيانات الإكسل (Map Excel Data)</h3>
                </div>
                <button onClick={() => setMappingData(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Header Row (صف العناوين)</label>
                  <select 
                    value={mappingData.headerRowIndex}
                    onChange={(e) => setMappingData({ ...mappingData, headerRowIndex: Number(e.target.value) })}
                    className="w-full rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 py-2 px-3"
                  >
                    {mappingData.rawData.slice(0, 20).map((_, idx) => (
                      <option key={idx} value={idx}>Row {idx + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name Column (الاسم)</label>
                  <select 
                    value={mappingData.nameColIndex}
                    onChange={(e) => setMappingData({ ...mappingData, nameColIndex: Number(e.target.value) })}
                    className="w-full rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 py-2 px-3"
                  >
                    <option value={-1}>-- Ignore (تجاهل) --</option>
                    {Array.from({ length: maxCols }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Column {idx + 1} {mappingData.rawData[mappingData.headerRowIndex]?.[idx] ? `(${mappingData.rawData[mappingData.headerRowIndex][idx]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Column (الرقم)</label>
                  <select 
                    value={mappingData.phoneColIndex}
                    onChange={(e) => setMappingData({ ...mappingData, phoneColIndex: Number(e.target.value) })}
                    className="w-full rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 py-2 px-3"
                  >
                    <option value={-1}>-- Ignore (تجاهل) --</option>
                    {Array.from({ length: maxCols }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Column {idx + 1} {mappingData.rawData[mappingData.headerRowIndex]?.[idx] ? `(${mappingData.rawData[mappingData.headerRowIndex][idx]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount Column (المبلغ)</label>
                  <select 
                    value={mappingData.amountColIndex}
                    onChange={(e) => setMappingData({ ...mappingData, amountColIndex: Number(e.target.value) })}
                    className="w-full rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 py-2 px-3"
                  >
                    <option value={-1}>-- Ignore (تجاهل) --</option>
                    {Array.from({ length: maxCols }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Column {idx + 1} {mappingData.rawData[mappingData.headerRowIndex]?.[idx] ? `(${mappingData.rawData[mappingData.headerRowIndex][idx]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-100 p-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 bg-slate-50 border-b border-r border-slate-200 text-xs font-bold text-slate-400 text-center w-12 sticky left-0 z-20">
                          #
                        </th>
                        {Array.from({ length: maxCols }).map((_, colIndex) => {
                          let label = "";
                          if (colIndex === mappingData.nameColIndex) label = "Name (الاسم)";
                          else if (colIndex === mappingData.phoneColIndex) label = "Phone (الرقم)";
                          else if (colIndex === mappingData.amountColIndex) label = "Amount (المبلغ)";
                          
                          return (
                            <th key={colIndex} className={cn(
                              "px-4 py-3 bg-slate-50 border-b border-r border-slate-200 text-xs font-bold whitespace-nowrap",
                              label ? "text-emerald-700 bg-emerald-50" : "text-slate-500"
                            )}>
                              <div className="flex flex-col">
                                <span className="text-slate-400 mb-1">Col {colIndex + 1}</span>
                                {label && <span className="font-bold">{label}</span>}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {mappingData.rawData.slice(0, 100).map((row, rowIndex) => {
                        const isHeader = rowIndex === mappingData.headerRowIndex;
                        return (
                          <tr key={rowIndex} className={cn(
                            "hover:bg-slate-50",
                            isHeader && "bg-blue-50/50"
                          )}>
                            <td className="px-4 py-2 border-b border-r border-slate-100 text-xs font-medium text-slate-400 text-center bg-white sticky left-0 z-10">
                              {rowIndex + 1}
                              {isHeader && <div className="text-[9px] text-blue-500 uppercase mt-0.5">Header</div>}
                            </td>
                            {Array.from({ length: maxCols }).map((_, colIndex) => {
                              const cellValue = row[colIndex] !== undefined ? String(row[colIndex]) : "";
                              return (
                                <td key={colIndex} className={cn(
                                  "px-4 py-2 border-b border-r border-slate-100 text-sm whitespace-nowrap max-w-[200px] truncate",
                                  isHeader ? "font-bold text-slate-800" : "text-slate-600",
                                  (colIndex === mappingData.nameColIndex || colIndex === mappingData.phoneColIndex || colIndex === mappingData.amountColIndex) && "bg-emerald-50/20"
                                )} title={cellValue}>
                                  {cellValue}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {mappingData.rawData.length > 100 && (
                        <tr>
                          <td colSpan={maxCols + 1} className="px-4 py-3 text-center text-sm text-slate-500 italic bg-slate-50">
                            Showing first 100 rows of {mappingData.rawData.length}...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  Select the correct columns and click Import.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMappingData(null)}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                  >
                    Import Data
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
