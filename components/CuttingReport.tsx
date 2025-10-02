
import React, { useState, useMemo } from 'react';
import { CuttingReport as CuttingReportType, Order, Sizes } from '../types';
import { CuttingIcon, CheckCircleIcon } from './icons/Icons';

interface CuttingReportProps {
  reports: CuttingReportType[];
  orders: Order[];
  onViewDetails: (key: string) => void;
  onEdit: (reports: CuttingReportType[]) => void;
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

const CuttingReport: React.FC<CuttingReportProps> = ({ reports, orders, onViewDetails, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [modelFilter, setModelFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'pending'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const uniqueColors = useMemo(() => {
    const colors = new Set(reports.map(report => report.color));
    return Array.from(colors).sort();
  }, [reports]);

  const uniqueModels = useMemo(() => {
    const models = new Set(reports.map(report => report.productName));
    return Array.from(models).sort();
  }, [reports]);

  const groupedReports = useMemo(() => {
    // Step 1: Group reports by their groupId
    const groups = new Map<string, CuttingReportType[]>();
    reports.forEach(report => {
        const key = report.groupId;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(report);
    });

    // Step 2: Process each group to aggregate data and add context from orders
    let processedGroups = Array.from(groups.values()).map(reportGroup => {
        reportGroup.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const representativeReport = reportGroup[0];
        const groupId = representativeReport.groupId;
        
        // Find all orders associated with this group ID
        const ordersInGroup = orders.filter(o => o.groupId === groupId);

        if (ordersInGroup.length === 0) return null;
        
        // Calculate total CUT quantities by summing up all reports in the group
        const combinedCutSizes = reportGroup.reduce((acc, report) => {
            SIZES_ORDER.forEach(size => {
                acc[size] = (acc[size] || 0) + (report.sizes[size] || 0);
            });
            return acc;
        }, { ...SIZES_ORDER.reduce((o, key) => ({ ...o, [key]: 0 }), {}) } as Sizes);
        // FIX: Explicitly cast value to a number in reduce function to prevent type error.
        const totalCutQuantity = Object.values(combinedCutSizes).reduce((sum, qty) => sum + Number(qty), 0);

        // Calculate total ORDERED quantities from all associated orders
        const combinedOrderedSizes = ordersInGroup.reduce((acc, order) => {
            SIZES_ORDER.forEach(size => {
                acc[size] = (acc[size] || 0) + (order.sizes[size] || 0);
            });
            return acc;
        }, { ...SIZES_ORDER.reduce((o, key) => ({ ...o, [key]: 0 }), {}) } as Sizes);
        const totalOrderedQuantity = Object.values(combinedOrderedSizes).reduce((sum, qty) => sum + Number(qty), 0);

        const isGroupConfirmed = reportGroup.some(r => r.isConfirmed);
        
        return {
            key: groupId,
            createdDate: representativeReport.date,
            productName: representativeReport.productName,
            color: representativeReport.color,
            groupId: groupId,
            cutSizes: combinedCutSizes,
            orderedSizes: combinedOrderedSizes,
            totalCutQuantity,
            totalOrderedQuantity,
            status: isGroupConfirmed ? 'Onaylandı' : 'Onay Bekliyor',
            originalReports: reportGroup
        };
    }).filter((g): g is NonNullable<typeof g> => g !== null);

    // Step 3: Apply filters
    if (startDate) {
        processedGroups = processedGroups.filter(group => new Date(group.createdDate).toISOString().split('T')[0] >= startDate);
    }
    if (endDate) {
        processedGroups = processedGroups.filter(group => new Date(group.createdDate).toISOString().split('T')[0] <= endDate);
    }
    if (modelFilter) {
      processedGroups = processedGroups.filter(group => group.productName === modelFilter);
    }
    if (colorFilter) {
      processedGroups = processedGroups.filter(group => group.color.includes(colorFilter));
    }
    if (statusFilter === 'confirmed') {
      processedGroups = processedGroups.filter(group => group.status === 'Onaylandı');
    } else if (statusFilter === 'pending') {
      processedGroups = processedGroups.filter(group => group.status === 'Onay Bekliyor');
    }
    if (searchTerm) {
      processedGroups = processedGroups.filter(group =>
        group.groupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.color.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Step 4: Apply sorting
    processedGroups.sort((a, b) => {
        const dateA = new Date(a.createdDate).getTime();
        const dateB = new Date(b.createdDate).getTime();
        // FIX: Corrected a typo in the sort logic. Changed 'a' to 'dateA'.
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return processedGroups;
}, [reports, orders, searchTerm, sortOrder, modelFilter, colorFilter, statusFilter, startDate, endDate]);

  const handleDateFilter = (isoDate: string) => {
    const formattedDate = new Date(isoDate).toISOString().split('T')[0];
    setStartDate(formattedDate);
    setEndDate(formattedDate);
    // Resetting other filters
    setSearchTerm('');
    setModelFilter('');
    setColorFilter('');
    setStatusFilter('all');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSortOrder('asc');
    setModelFilter('');
    setColorFilter('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };
  
  const exportToCSV = () => {
    const headers = ['Tarih', 'Emir No', 'Model', 'Renk', ...SIZES_ORDER.flatMap(s => [`${s.toUpperCase()} İstenen`, `${s.toUpperCase()} Kesilen`]), 'Toplam İstenen', 'Toplam Kesilen', 'Durum'];
    
    const csvRows = [
      headers.join(','),
      ...groupedReports.map(group => {
        const row = [
          new Date(group.createdDate).toLocaleDateString('tr-TR'),
          `"${group.groupId}"`,
          `"${group.productName}"`,
          `"${group.color}"`,
          ...SIZES_ORDER.flatMap(size => [group.orderedSizes[size], group.cutSizes[size]]),
          group.totalOrderedQuantity,
          group.totalCutQuantity,
          group.status
        ];
        return row.join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'kesim_raporlari_karsilastirmali.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center"><CuttingIcon className="w-8 h-8 mr-3"/>Kesim Raporu</h1>
      </div>
      
       {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4 p-4 bg-background rounded-lg border border-border-color">
        <input
          type="text"
          placeholder="Ara (Emir No, Model...)"
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
            <option value="all">Tüm Durumlar</option>
            <option value="confirmed">Onaylandı</option>
            <option value="pending">Onay Bekliyor</option>
        </select>
        <div className="flex items-center gap-2">
            <label htmlFor="start-date-cr" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Başlangıç:</label>
            <input type="date" id="start-date-cr" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="end-date-cr" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Bitiş:</label>
            <input type="date" id="end-date-cr" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
        </div>
         <div className="flex gap-2 col-span-full xl:col-span-3 justify-end">
            <button onClick={handleResetFilters} className="px-4 py-2 bg-red-600/80 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors">
                Filtreleri Temizle
            </button>
            <button onClick={exportToCSV} className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Karşılaştırmalı CSV
            </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {groupedReports.map((group) => (
          <div key={group.key} className="bg-background p-4 rounded-lg border border-border-color shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-sm text-primary lowercase">{group.groupId}</p>
                <button onClick={() => handleDateFilter(group.createdDate)} className="text-xs text-text-secondary hover:underline hover:text-primary transition-colors" title={`${new Date(group.createdDate).toLocaleDateString('tr-TR')} tarihli raporları filtrele`}>
                    {new Date(group.createdDate).toLocaleDateString('tr-TR')}
                </button>
                <p className="font-bold text-text-primary">{group.productName}</p>
                <p className="text-sm text-text-secondary">{group.color}</p>
              </div>
              {group.status === 'Onaylandı' ? (
                  <span className="px-2 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-secondary text-green-900">
                      <CheckCircleIcon className="w-4 h-4" /> Onaylandı
                  </span>
              ) : (
                  <span className="px-2 py-1 inline-flex text-xs font-semibold rounded-full bg-yellow-500 text-yellow-900">
                      Onay Bekliyor
                  </span>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border-color flex justify-around text-center">
              <div>
                <p className="text-xs text-text-secondary">Toplam Kesilen</p>
                <p className="text-2xl font-bold text-secondary">{group.totalCutQuantity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Toplam İstenen</p>
                <p className="text-2xl font-bold text-text-primary">{group.totalOrderedQuantity.toLocaleString()}</p>
              </div>
            </div>
             <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {SIZES_ORDER.map(size => {
                  const cut = group.cutSizes[size];
                  const ordered = group.orderedSizes[size];
                  if (cut === 0 && ordered === 0) return null;
                  return (
                    <div key={size} className="bg-surface rounded p-1">
                      <p className="font-bold uppercase text-text-secondary">{size}</p>
                      <p><span className="text-secondary font-semibold">{cut}</span> / {ordered}</p>
                    </div>
                  )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-border-color flex justify-end gap-4">
              <button onClick={() => onViewDetails(group.key)} className="text-blue-400 hover:text-blue-300" title="Detayları Görüntüle">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
              <button onClick={() => onEdit(group.originalReports)} className="text-yellow-400 hover:text-yellow-300" title='Düzenle'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </div>
          </div>
        ))}
        {groupedReports.length === 0 && (
          <div className="text-center py-10">
            <p className="text-text-secondary">Filtrelerle eşleşen kesim raporu bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border-color">
          <thead className="bg-background">
            <tr>
              <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Tarih</th>
              <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Emir No</th>
              <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Model</th>
              <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Renk</th>
              {SIZES_ORDER.map(size => (
                 <th key={size} className="px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{size}</th>
              ))}
              <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Toplam İstenen</th>
              <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Toplam Kesilen</th>
              <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Durum</th>
              <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">İşlemler</th>
            </tr>
            <tr>
              {SIZES_ORDER.map(size => (
                <th key={`${size}-sub`} className="px-2 py-1 text-center text-[10px] font-medium text-text-secondary/80 normal-case">Kesilen / İstenen</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border-color">
            {groupedReports.length > 0 ? groupedReports.map((group) => (
              <tr key={group.key} className="hover:bg-background transition-colors duration-150">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                    <button onClick={() => handleDateFilter(group.createdDate)} className="hover:underline hover:text-primary transition-colors" title={`${new Date(group.createdDate).toLocaleDateString('tr-TR')} tarihli raporları filtrele`}>
                        {new Date(group.createdDate).toLocaleDateString('tr-TR')}
                    </button>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary font-mono lowercase">{group.groupId}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary font-medium">{group.productName}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">{group.color}</td>
                
                {SIZES_ORDER.map(size => {
                  const cut = group.cutSizes[size];
                  const ordered = group.orderedSizes[size];
                  return (
                    <td key={size} className="px-2 py-4 text-center whitespace-nowrap text-sm text-text-primary">
                      {cut > 0 || ordered > 0 ? (
                        <>
                          <span className="font-bold text-secondary">{cut}</span>
                          <span className="text-text-secondary"> / {ordered}</span>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-4 text-center whitespace-nowrap text-sm font-bold text-text-secondary">{group.totalOrderedQuantity.toLocaleString()}</td>
                <td className="px-4 py-4 text-center whitespace-nowrap text-sm font-bold text-secondary">{group.totalCutQuantity.toLocaleString()}</td>
                 <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                   {group.status === 'Onaylandı' ? (
                        <span className="px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full bg-secondary text-green-900">
                            <CheckCircleIcon className="w-4 h-4" /> Onaylandı
                        </span>
                    ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500 text-yellow-900">
                           Onay Bekliyor
                        </span>
                    )}
                 </td>
                 <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                   <div className="inline-flex items-center justify-center gap-2">
                        <button onClick={() => onViewDetails(group.key)} className="text-blue-400 hover:text-blue-300" title="Detayları Görüntüle"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                        <button onClick={() => onEdit(group.originalReports)} className="text-yellow-400 hover:text-yellow-300" title='Düzenle'><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                   </div>
                 </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={15} className="text-center py-10 text-text-secondary">
                        Filtrelerle eşleşen kesim raporu bulunamadı.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
export default CuttingReport;
