
import React, { useState, useMemo } from 'react';
import { StockEntry, StockUsage, Sizes } from '../types';
import { BoxIcon, ArchiveBoxIcon, TagIcon, InformationCircleIcon, FactoryIcon } from './icons/Icons';

interface StockRecordsProps {
  entries: StockEntry[];
  onEdit: (entry: StockEntry) => void;
  onArchive: (entryId: string) => void;
  stockUsage: StockUsage[];
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };

const StockRecords: React.FC<StockRecordsProps> = ({ entries, onEdit, onArchive, stockUsage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [modelFilter, setModelFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'defective'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const uniqueColors = useMemo(() => {
    const colors = new Set(entries.map(entry => entry.color));
    return Array.from(colors).sort();
  }, [entries]);

  const uniqueModels = useMemo(() => {
    const models = new Set(entries.map(entry => entry.productName));
    return Array.from(models).sort();
  }, [entries]);
  
  const calculateTotal = (sizes: Sizes) => {
    return Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  }

  const usageMap = useMemo(() => {
    const map = new Map<string, { usedNormal: Sizes, usedDefective: Sizes }>();
    if (!stockUsage) return map;

    for (const usage of stockUsage) {
        if (!map.has(usage.stockEntryId)) {
            map.set(usage.stockEntryId, { usedNormal: { ...emptySizes }, usedDefective: { ...emptySizes } });
        }
        const currentUsage = map.get(usage.stockEntryId)!;
        for (const size of SIZES_ORDER) {
            currentUsage.usedNormal[size] += usage.usedNormalSizes[size] || 0;
            currentUsage.usedDefective[size] += usage.usedDefectiveSizes[size] || 0;
        }
    }
    return map;
  }, [stockUsage]);

  const processedEntries = useMemo(() => {
    // 1. Initial filtering on original entries based on text and dropdowns
    const filteredOriginalEntries = entries.filter(entry => {
        if (startDate && new Date(entry.date) < new Date(startDate)) return false;
        if (endDate && new Date(entry.date) > new Date(endDate)) return false;
        if (modelFilter && entry.productName !== modelFilter) return false;
        if (colorFilter && entry.color !== colorFilter) return false;
        if (searchTerm && !(
            entry.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.color.toLowerCase().includes(searchTerm.toLowerCase())
        )) return false;
        return true;
    });

    // 2. Flatten entries into display rows for normal and defective parts
    const flatEntries = filteredOriginalEntries.flatMap(entry => {
        const results: (StockEntry & {
            key: string;
            type: 'Normal' | 'Defolu';
            displaySizes: Sizes;
            usedSizes: Sizes;
            totalQuantity: number;
            totalUsed: number;
            remainingQuantity: number;
        })[] = [];

        const usage = usageMap.get(entry.id) || { usedNormal: { ...emptySizes }, usedDefective: { ...emptySizes } };
        const totalNormal = calculateTotal(entry.normalSizes);
        const totalDefective = calculateTotal(entry.defectiveSizes);

        if (totalNormal > 0) {
            const totalUsed = calculateTotal(usage.usedNormal);
            results.push({
                ...entry,
                key: `${entry.id}-normal`,
                type: 'Normal',
                displaySizes: entry.normalSizes,
                usedSizes: usage.usedNormal,
                totalQuantity: totalNormal,
                totalUsed,
                remainingQuantity: totalNormal - totalUsed,
                defectReason: undefined, // Explicitly clear defect reason for normal entries
            });
        }

        if (totalDefective > 0) {
            const totalUsed = calculateTotal(usage.usedDefective);
            results.push({
                ...entry,
                key: `${entry.id}-defective`,
                type: 'Defolu',
                displaySizes: entry.defectiveSizes,
                usedSizes: usage.usedDefective,
                totalQuantity: totalDefective,
                totalUsed,
                remainingQuantity: totalDefective - totalUsed,
            });
        }
        return results;
    });

    // 3. Filter by type (normal/defective)
    let displayEntries = flatEntries;
    if (typeFilter === 'normal') {
      displayEntries = displayEntries.filter(e => e.type === 'Normal');
    } else if (typeFilter === 'defective') {
      displayEntries = displayEntries.filter(e => e.type === 'Defolu');
    }
    
    // 4. Sorting
    displayEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        // If dates are the same, sort by other properties for stable order
        if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
        if (a.color !== b.color) return a.color.localeCompare(b.color);
        return a.type.localeCompare(b.type); // Normal before Defolu
    });

    return displayEntries;
  }, [entries, searchTerm, sortOrder, modelFilter, colorFilter, typeFilter, startDate, endDate, usageMap]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSortOrder('asc');
    setModelFilter('');
    setColorFilter('');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
  };
  
  const exportToCSV = () => {
    const headers = [
        'Tarih', 'Model', 'Renk', 'Tip', 'Defo Sebebi',
        ...SIZES_ORDER.flatMap(s => [`${s.toUpperCase()} Giren`, `${s.toUpperCase()} Kullanılan`, `${s.toUpperCase()} Kalan`]),
        'Toplam Giren', 'Toplam Kullanılan', 'Kalan Stok'
    ];
    
    const csvRows = [
      headers.join(','),
      ...processedEntries.map(entry => {
        const row = [
          new Date(entry.date).toLocaleDateString('tr-TR'),
          `"${entry.productName}"`,
          `"${entry.color}"`,
          `"${entry.type}"`,
          `"${entry.defectReason || ''}"`,
          ...SIZES_ORDER.flatMap(size => {
              const entered = entry.displaySizes[size];
              const used = entry.usedSizes[size] || 0;
              const remaining = entered - used;
              return [entered, used, remaining];
          }),
          entry.totalQuantity,
          entry.totalUsed,
          entry.remainingQuantity
        ];
        return row.join(',');
      })
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'stok_kayitlari_detayli.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center"><BoxIcon className="w-8 h-8 mr-3"/>Stok Kayıtları</h1>
      </div>

       {/* Filters */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4 p-4 bg-background rounded-lg border border-border-color">
        <input
          type="text"
          placeholder="Ara (Model, Renk...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="asc">Eskiden Yeniye</option>
          <option value="desc">Yeniden Eskiye</option>
        </select>
        <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">Tüm Modeller</option>
          {uniqueModels.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
        <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">Tüm Renkler</option>
          {uniqueColors.map(color => <option key={color} value={color}>{color}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'normal' | 'defective')} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="all">Tüm Tipler</option>
          <option value="normal">Normal</option>
          <option value="defective">Defolu</option>
        </select>
        <div className="flex items-center gap-2">
            <label htmlFor="start-date-sr" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Başlangıç:</label>
            <input type="date" id="start-date-sr" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="end-date-sr" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Bitiş:</label>
            <input type="date" id="end-date-sr" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
        </div>
        <div className="flex gap-2 col-span-full xl:col-span-3 justify-end">
            <button onClick={handleResetFilters} className="px-4 py-2 bg-red-600/80 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors">
                Filtreleri Temizle
            </button>
            <button onClick={exportToCSV} className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Detaylı CSV Aktar
            </button>
        </div>
      </div>

       {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {processedEntries.map((entry) => (
            <div key={entry.key} className={`bg-background p-4 rounded-lg border ${entry.type === 'Defolu' ? 'border-red-500/30' : 'border-border-color'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-bold text-text-primary">{entry.productName}</p>
                        <p className="text-sm text-text-secondary">{entry.color}</p>
                    </div>
                    <button
                        onClick={() => setTypeFilter(entry.type === 'Normal' ? 'normal' : 'defective')}
                        title={`Sadece '${entry.type}' tipindekileri göster`}
                        className={`px-2 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                            entry.type === 'Defolu'
                            ? 'bg-red-500/20 text-red-400 focus:ring-red-500'
                            : 'bg-green-500/20 text-green-400 focus:ring-green-500'
                        }`}
                    >
                        <TagIcon className="w-4 h-4" /> {entry.type}
                    </button>
                </div>

                 {entry.type === 'Defolu' && entry.defectReason && 
                    <p className="text-xs text-red-400 mb-3">Sebep: {entry.defectReason}</p>
                 }

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs">
                    {SIZES_ORDER.map(size => {
                        const entered = entry.displaySizes[size];
                        if (entered === 0) return null;
                        const used = entry.usedSizes[size] || 0;
                        const remaining = entered - used;
                        return (
                             <div key={size} className="bg-surface rounded p-1 flex flex-col justify-between">
                                <p className="font-bold uppercase text-text-secondary">{size}</p>
                                <p className={`font-medium text-lg ${entry.type === 'Defolu' ? 'text-red-400' : 'text-text-primary'}`}>{entered}</p>
                                <div className="text-xs text-text-secondary/90 -mt-1">
                                    <span className="font-semibold text-yellow-500" title="Kullanılan">{used}</span>
                                    <span>/</span>
                                    <span className="font-semibold text-secondary" title="Kalan">{remaining}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
               
                <div className="mt-4 pt-3 border-t border-border-color flex justify-end gap-2">
                    <button onClick={() => onEdit(entry)} className="p-2 text-yellow-400 hover:text-yellow-300" title="Düzenle"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => onArchive(entry.id)} className="p-2 text-red-500 hover:text-red-400" title="Arşivle"><ArchiveBoxIcon className="h-6 w-6" /></button>
                </div>
            </div>
          ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border-color">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tarih</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Model</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Renk</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Tip</th>
              {SIZES_ORDER.map(size => <th key={size} className="px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{size}</th>)}
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam Giren</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Defo Sebebi</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border-color">
            {processedEntries.map((entry) => (
              <tr key={entry.key} className={`hover:bg-background transition-colors duration-150 ${entry.type === 'Defolu' ? 'bg-red-500/5' : ''}`}>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">{new Date(entry.date).toLocaleDateString('tr-TR')}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">{entry.productName}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">{entry.color}</td>
                <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                  <button
                    onClick={() => setTypeFilter(entry.type === 'Normal' ? 'normal' : 'defective')}
                    title={`Sadece '${entry.type}' tipindekileri göster`}
                    className={`px-2 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                        entry.type === 'Defolu'
                        ? 'bg-red-500/20 text-red-400 focus:ring-red-500'
                        : 'bg-green-500/20 text-green-400 focus:ring-green-500'
                    }`}
                  >
                    <TagIcon className="w-4 h-4" /> {entry.type}
                  </button>
                </td>
                {SIZES_ORDER.map((size) => {
                    const entered = entry.displaySizes[size];
                    if (entered === 0) {
                        return (
                            <td key={size} className="px-2 py-4 text-center whitespace-nowrap text-sm text-text-secondary">-</td>
                        );
                    }
                    const used = entry.usedSizes[size] || 0;
                    const remaining = entered - used;
                    return (
                        <td key={size} className="px-2 py-4 text-center whitespace-nowrap text-sm">
                            <div>
                                <div className={`font-bold text-lg ${entry.type === 'Defolu' ? 'text-red-400' : 'text-text-primary'}`}>{entered}</div>
                                <div className="text-xs text-text-secondary -mt-1">
                                    <span className="font-semibold text-yellow-500" title="Kullanılan">{used}</span>
                                    <span className="text-text-secondary/80"> / </span>
                                    <span className="font-semibold text-secondary" title="Kalan">{remaining}</span>
                                </div>
                            </div>
                        </td>
                    );
                })}
                <td className="px-4 py-4 text-center whitespace-nowrap text-sm font-bold text-text-primary">{entry.totalQuantity.toLocaleString()}</td>
                <td className={`px-4 py-4 whitespace-nowrap text-sm ${entry.type === 'Defolu' ? 'text-red-400' : 'text-text-secondary'}`}>{entry.defectReason || '-'}</td>
                <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                   <div className="inline-flex items-center justify-center gap-2">
                        <button onClick={() => onEdit(entry)} className="text-yellow-400 hover:text-yellow-300" title="Düzenle"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => onArchive(entry.id)} className="text-red-500 hover:text-red-400" title="Arşivle"><ArchiveBoxIcon className="h-5 w-5" /></button>
                   </div>
                </td>
              </tr>
            ))}
             {processedEntries.length === 0 && (
              <tr>
                <td colSpan={15} className="text-center py-10 text-text-secondary">
                  Filtrelerle eşleşen stok kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default StockRecords;
