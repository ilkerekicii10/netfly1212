
import React, { useState, useMemo } from 'react';
import { Order, Producer, ProductionStatus, Sizes } from '../types';
import { ListIcon, PlusCircleIcon, TrashIcon } from './icons/Icons';
import { STATUS_COLORS } from '../constants';

interface OrderListProps {
  orders: Order[];
  producers: Producer[];
  onViewDetails: (groupId: string) => void;
  onEdit: (order: Order) => void;
  onDelete: (groupId: string) => void;
  onCreateStockEntry: (productName: string, colors: string[]) => void;
}

// Represents a group of order parts that share the same groupId
interface OrderGroup {
  key: string;
  groupId: string;
  createdDate: string;
  productName: string;
  color: string;
  producers: string[];
  sizes: Sizes;
  totalQuantity: number;
  status: ProductionStatus;
  originalOrders: Order[]; // Keep original orders for editing/details
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

const OrderList: React.FC<OrderListProps> = ({ orders, producers, onViewDetails, onEdit, onDelete, onCreateStockEntry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | 'all'>('all');
  const [producerFilter, setProducerFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<OrderGroup | null>(null);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);


  const uniqueModels = useMemo(() => Array.from(new Set(orders.map(o => o.productName))).sort(), [orders]);
  const uniqueColors = useMemo(() => Array.from(new Set(orders.map(o => o.color))).sort(), [orders]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, Order[]>();
    orders.forEach(order => {
      if (!groups.has(order.groupId)) {
        groups.set(order.groupId, []);
      }
      groups.get(order.groupId)!.push(order);
    });

    let processedGroups: OrderGroup[] = Array.from(groups.values()).map(orderGroup => {
      const representativeOrder = orderGroup[0];
      
      const combinedSizes = orderGroup.reduce((acc, order) => {
        (Object.keys(order.sizes) as Array<keyof Sizes>).forEach(size => {
          acc[size] = (acc[size] || 0) + (order.sizes[size] || 0);
        });
        return acc;
      }, { ...SIZES_ORDER.reduce((o, key) => ({ ...o, [key]: 0 }), {}) } as Sizes);

      const totalQuantity = Object.values(combinedSizes).reduce((sum, qty) => sum + qty, 0);
      
      const producers = [...new Set(orderGroup.map(o => o.producer || 'Atanmamış'))];

      // Determine the overall status of the group
      let status: ProductionStatus = 'Tamamlandı';
      if (orderGroup.some(o => o.status === 'İptal Edildi')) {
        status = 'İptal Edildi';
      } else if (orderGroup.some(o => o.status === 'Devam Ediyor')) {
        status = 'Devam Ediyor';
      } else if (orderGroup.some(o => o.status === 'Kesim Bekleniyor')) {
        status = 'Kesim Bekleniyor';
      }

      return {
        key: representativeOrder.groupId,
        groupId: representativeOrder.groupId,
        createdDate: representativeOrder.createdDate,
        productName: representativeOrder.productName,
        color: representativeOrder.color,
        producers,
        sizes: combinedSizes,
        totalQuantity,
        status,
        originalOrders: orderGroup,
      };
    });

    // Filtering
    if (startDate) {
        processedGroups = processedGroups.filter(g => new Date(g.createdDate).toISOString().split('T')[0] >= startDate);
    }
    if (endDate) {
        processedGroups = processedGroups.filter(g => new Date(g.createdDate).toISOString().split('T')[0] <= endDate);
    }
    if (statusFilter !== 'all') {
      processedGroups = processedGroups.filter(g => g.status === statusFilter);
    }
    if (producerFilter) {
      processedGroups = processedGroups.filter(g => g.producers.includes(producerFilter));
    }
    if (modelFilter) {
      processedGroups = processedGroups.filter(g => g.productName === modelFilter);
    }
    if (colorFilter) {
      processedGroups = processedGroups.filter(g => g.color === colorFilter);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedGroups = processedGroups.filter(g => 
        g.groupId.toLowerCase().includes(lowerSearchTerm) ||
        g.productName.toLowerCase().includes(lowerSearchTerm) ||
        g.color.toLowerCase().includes(lowerSearchTerm) ||
        g.producers.some(p => p.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Sorting
    processedGroups.sort((a, b) => {
      const dateA = new Date(a.createdDate).getTime();
      const dateB = new Date(b.createdDate).getTime();
      // FIX: Corrected a typo in the sort logic. Changed 'a' to 'dateA'.
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return processedGroups;
  }, [orders, searchTerm, statusFilter, producerFilter, modelFilter, colorFilter, sortOrder, startDate, endDate]);
  
  const handleQuickFilter = (
    type: 'model' | 'color' | 'status',
    value: string,
    modelForColor?: string
  ) => {
    // Reset specific filters based on the type of quick filter applied
    // to provide an intuitive filtering experience.
    if (type === 'model') {
      setModelFilter(value);
      setColorFilter('');
      setStatusFilter('all');
    } else if (type === 'color' && modelForColor) {
      setModelFilter(modelForColor);
      setColorFilter(value);
      setStatusFilter('all');
    } else if (type === 'status') {
      setStatusFilter(value as ProductionStatus);
      setModelFilter('');
      setColorFilter('');
    }
    // Clear selections when a new filter is applied
    setSelectedGroupKeys([]);
  };

  const handleDateFilter = (isoDate: string) => {
    const formattedDate = new Date(isoDate).toISOString().split('T')[0];
    setStartDate(formattedDate);
    setEndDate(formattedDate);
    // Resetting other filters for a focused view
    setSearchTerm('');
    setStatusFilter('all');
    setProducerFilter('');
    setModelFilter('');
    setColorFilter('');
    setSelectedGroupKeys([]);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setProducerFilter('');
    setModelFilter('');
    setColorFilter('');
    setSortOrder('asc');
    setStartDate('');
    setEndDate('');
    setSelectedGroupKeys([]);
  };

  const handleDeleteClick = (group: OrderGroup) => {
    setOrderToDelete(group);
  };
  
  const confirmDelete = () => {
    if (orderToDelete) {
      onDelete(orderToDelete.groupId);
      setOrderToDelete(null);
    }
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedGroupKeys(groupedOrders.map(g => g.key));
    } else {
        setSelectedGroupKeys([]);
    }
  };

  const handleSelectOne = (key: string) => {
    setSelectedGroupKeys(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleBulkDelete = () => {
    selectedGroupKeys.forEach(key => onDelete(key));
    setSelectedGroupKeys([]);
    setShowBulkDeleteConfirm(false);
  };

  const selectedOrdersForAction = useMemo(() =>
    groupedOrders.filter(g => selectedGroupKeys.includes(g.key)),
    [selectedGroupKeys, groupedOrders]
  );
  
  const isStockEntryDisabled = useMemo(() => {
    if (selectedOrdersForAction.length === 0) return true;
    const firstProductName = selectedOrdersForAction[0].productName;
    return selectedOrdersForAction.some(o => o.productName !== firstProductName);
  }, [selectedOrdersForAction]);

  const handleBulkStockEntry = () => {
    if (selectedOrdersForAction.length > 0) {
        const productName = selectedOrdersForAction[0].productName;
        const colors = selectedOrdersForAction.map(s => s.color);
        onCreateStockEntry(productName, colors);
        setSelectedGroupKeys([]);
    }
  };
  
  const exportToCSV = () => {
    const headers = ['Tarih', 'Emir No', 'Model', 'Renk', 'Atölyeler', ...SIZES_ORDER.map(s => s.toUpperCase()), 'Toplam Adet', 'Durum'];
    
    const csvRows = [
      headers.join(','),
      ...groupedOrders.map(group => {
        const row = [
          new Date(group.createdDate).toLocaleDateString('tr-TR'),
          `"${group.groupId}"`,
          `"${group.productName}"`,
          `"${group.color}"`,
          `"${group.producers.join(' | ')}"`,
          ...SIZES_ORDER.map(size => group.sizes[size]),
          group.totalQuantity,
          group.status
        ];
        return row.join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'siparis_listesi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center"><ListIcon className="w-8 h-8 mr-3"/>Sipariş Listesi</h1>
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="all">Tüm Durumlar</option>
          {Object.keys(STATUS_COLORS).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={producerFilter} onChange={(e) => setProducerFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">Tüm Atölyeler</option>
          {producers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          <option value="Atanmamış">Atanmamış</option>
        </select>
        <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">Tüm Modeller</option>
          {uniqueModels.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
        <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">Tüm Renkler</option>
          {uniqueColors.map(color => <option key={color} value={color}>{color}</option>)}
        </select>
        <div className="flex items-center gap-2">
            <label htmlFor="start-date-ol" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Başlangıç:</label>
            <input type="date" id="start-date-ol" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="end-date-ol" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Bitiş:</label>
            <input type="date" id="end-date-ol" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
        </div>
        <div className="flex gap-2 col-span-full xl:col-span-2 justify-end">
            <button onClick={handleResetFilters} className="px-4 py-2 bg-red-600/80 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors">
                Filtreleri Temizle
            </button>
            <button onClick={exportToCSV} className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                CSV Aktar
            </button>
        </div>
      </div>
      
       {/* Contextual Action Bar */}
        {selectedGroupKeys.length > 0 && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
                <p className="font-semibold text-primary">{selectedGroupKeys.length} sipariş seçildi.</p>
                <div className="flex gap-3">
                    <button 
                        onClick={handleBulkStockEntry} 
                        disabled={isStockEntryDisabled}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isStockEntryDisabled ? 'Stok girişi için tüm seçili siparişler aynı model olmalıdır.' : 'Seçili siparişlerden stok girişi oluştur'}
                    >
                        <PlusCircleIcon className="w-5 h-5"/> Stok Girişi Oluştur
                    </button>
                    <button 
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <TrashIcon className="w-5 h-5"/> Seçilenleri Sil
                    </button>
                </div>
            </div>
        )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {groupedOrders.map(group => (
          <div key={group.key} className={`bg-background p-4 rounded-lg border shadow transition-colors ${selectedGroupKeys.includes(group.key) ? 'border-primary' : 'border-border-color'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <input 
                    type="checkbox"
                    checked={selectedGroupKeys.includes(group.key)}
                    onChange={() => handleSelectOne(group.key)}
                    className="mt-1 rounded bg-surface border-text-secondary text-primary focus:ring-primary"
                />
                <div className="flex flex-col items-start">
                  <p className="font-mono text-sm text-primary lowercase">{group.groupId}</p>
                  <button onClick={() => handleDateFilter(group.createdDate)} className="text-xs text-text-secondary hover:underline hover:text-primary transition-colors text-left" title={`${new Date(group.createdDate).toLocaleDateString('tr-TR')} tarihli siparişleri filtrele`}>
                    {new Date(group.createdDate).toLocaleDateString('tr-TR')}
                  </button>
                   <button onClick={() => handleQuickFilter('model', group.productName)} className="font-bold text-text-primary text-left hover:underline hover:text-primary transition-colors" title={`Sadece '${group.productName}' modelini filtrele`}>
                       {group.productName}
                   </button>
                   <button onClick={() => handleQuickFilter('color', group.color, group.productName)} className="text-sm text-text-secondary text-left hover:underline hover:text-primary transition-colors" title={`'${group.productName} - ${group.color}' için filtrele`}>
                       {group.color}
                   </button>
                </div>
              </div>
               <button onClick={() => handleQuickFilter('status', group.status)} className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[group.status]} transition-transform hover:scale-105`} title={`Sadece '${group.status}' durumunu filtrele`}>
                    {group.status}
                </button>
            </div>
            <div className="mt-4 pt-4 border-t border-border-color flex justify-between items-center">
              <div>
                <p className="text-xs text-text-secondary">Toplam Adet</p>
                <p className="text-2xl font-bold text-secondary">{group.totalQuantity.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">Atölye(ler)</p>
                <div className="text-sm font-medium text-text-primary">
                    {group.producers.map(p => <div key={p}>{p}</div>)}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border-color flex justify-end gap-4">
              <button onClick={() => onCreateStockEntry(group.productName, [group.color])} className="text-green-400 hover:text-green-300" title="Bu siparişten stok girişi oluştur">
                <PlusCircleIcon className="h-6 w-6" />
              </button>
              <button onClick={() => onViewDetails(group.groupId)} className="text-blue-400 hover:text-blue-300" title="Detayları Görüntüle">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
              <button onClick={() => onEdit(group.originalOrders[0])} className="text-yellow-400 hover:text-yellow-300" title='Düzenle'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => handleDeleteClick(group)} className="text-red-500 hover:text-red-400" title='Sil'>
                  <TrashIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        ))}
        {groupedOrders.length === 0 && (
          <div className="text-center py-10">
            <p className="text-text-secondary">Filtrelerle eşleşen sipariş bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border-color">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3">
                <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={groupedOrders.length > 0 && selectedGroupKeys.length === groupedOrders.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedGroupKeys.length > 0 && selectedGroupKeys.length < groupedOrders.length;
                      }
                    }}
                    className="rounded bg-surface border-text-secondary text-primary focus:ring-primary"
                    aria-label="Tümünü seç"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tarih</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Emir No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Model</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Renk</th>
              {SIZES_ORDER.map(size => <th key={size} className="px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{size}</th>)}
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Atölye</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Durum</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border-color">
            {groupedOrders.length > 0 ? groupedOrders.map(group => (
              <tr key={group.key} className={`transition-colors duration-150 ${selectedGroupKeys.includes(group.key) ? 'bg-primary/10' : 'hover:bg-background'}`}>
                <td className="px-4 py-2">
                    <input
                        type="checkbox"
                        checked={selectedGroupKeys.includes(group.key)}
                        onChange={() => handleSelectOne(group.key)}
                        className="rounded bg-background border-text-secondary text-primary focus:ring-primary"
                    />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                    <button onClick={() => handleDateFilter(group.createdDate)} className="hover:underline hover:text-primary transition-colors" title={`${new Date(group.createdDate).toLocaleDateString('tr-TR')} tarihli siparişleri filtrele`}>
                        {new Date(group.createdDate).toLocaleDateString('tr-TR')}
                    </button>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary font-mono lowercase">{group.groupId}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button onClick={() => handleQuickFilter('model', group.productName)} className="font-medium hover:underline hover:text-primary transition-colors" title={`Sadece '${group.productName}' modelini filtrele`}>
                        {group.productName}
                    </button>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                     <button onClick={() => handleQuickFilter('color', group.color, group.productName)} className="text-text-secondary hover:underline hover:text-primary transition-colors" title={`'${group.productName} - ${group.color}' için filtrele`}>
                        {group.color}
                    </button>
                </td>
                {SIZES_ORDER.map(size => (
                  <td key={size} className="px-2 py-4 text-center whitespace-nowrap text-sm text-text-primary">
                    {group.sizes[size] > 0 ? group.sizes[size] : '-'}
                  </td>
                ))}
                <td className="px-4 py-4 text-center whitespace-nowrap text-sm font-bold text-secondary">{group.totalQuantity.toLocaleString()}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">{group.producers.join(', ')}</td>
                 <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                    <button onClick={() => handleQuickFilter('status', group.status)} className={`w-full text-center px-3 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[group.status]} transition-transform hover:scale-105`} title={`Sadece '${group.status}' durumunu filtrele`}>
                        {group.status}
                    </button>
                 </td>
                 <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                   <div className="inline-flex items-center justify-center gap-2">
                        <button onClick={() => onCreateStockEntry(group.productName, [group.color])} className="text-green-400 hover:text-green-300" title="Stok Girişi"><PlusCircleIcon className="h-5 w-5"/></button>
                        <button onClick={() => onViewDetails(group.groupId)} className="text-blue-400 hover:text-blue-300" title="Detaylar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                        <button onClick={() => onEdit(group.originalOrders[0])} className="text-yellow-400 hover:text-yellow-300" title='Düzenle'><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => handleDeleteClick(group)} className="text-red-500 hover:text-red-400" title='Sil'><TrashIcon className="h-5 w-5"/></button>
                   </div>
                 </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={16} className="text-center py-10 text-text-secondary">
                        Filtrelerle eşleşen sipariş bulunamadı.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {orderToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setOrderToDelete(null)}>
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md border border-border-color" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-text-primary">Sipariş Grubunu Sil</h3>
                    <p className="mt-2 text-sm text-text-secondary">
                        <span className="font-semibold text-red-400">{orderToDelete.productName} - {orderToDelete.color}</span> siparişini ve ilgili tüm parçalarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </p>
                </div>
                <div className="p-4 flex justify-end gap-4 bg-background/50 rounded-b-xl">
                    <button onClick={() => setOrderToDelete(null)} className="px-4 py-2 text-text-primary font-bold rounded-lg hover:bg-border-color transition-colors">İptal</button>
                    <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Evet, Sil</button>
                </div>
            </div>
        </div>
      )}

       {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowBulkDeleteConfirm(false)}>
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md border border-border-color" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-text-primary">Seçili Siparişleri Sil</h3>
                    <p className="mt-2 text-sm text-text-secondary">
                       Seçili <span className="font-semibold text-red-400">{selectedGroupKeys.length}</span> sipariş grubunu ve ilgili tüm parçalarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </p>
                </div>
                <div className="p-4 flex justify-end gap-4 bg-background/50 rounded-b-xl">
                    <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-4 py-2 text-text-primary font-bold rounded-lg hover:bg-border-color transition-colors">İptal</button>
                    <button onClick={handleBulkDelete} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Evet, Hepsini Sil</button>
                </div>
            </div>
        </div>
      )}
    </section>
  );
};

export default OrderList;
