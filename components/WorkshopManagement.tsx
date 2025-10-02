
import React, { useState, useEffect, useMemo } from 'react';
import { Producer, ProducerPerformanceStat, Order, Sizes, ProductionStatus, StockEntry, StockUsage, CuttingReport } from '../types';
import { UsersIcon, PlusIcon, FactoryIcon, CheckCircleIcon, ClockIcon, TrashIcon, XIcon, ArrowUturnLeftIcon, TagIcon } from './icons/Icons';
import { STATUS_COLORS } from '../constants';

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

interface ProducerFormModalProps {
    producer: Producer | null;
    onClose: () => void;
    onSave: (producerData: Omit<Producer, 'id'>) => Promise<boolean>;
    onUpdate: (id: number, producerData: Partial<Omit<Producer, 'id'>>) => Promise<void>;
    producers: Producer[];
}

const ProducerFormModal: React.FC<ProducerFormModalProps> = ({ producer, onClose, onSave, onUpdate }) => {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isEditMode = !!producer;

    useEffect(() => {
        if (producer) {
            setName(producer.name || '');
            setContactPerson(producer.contactPerson || '');
            setPhone(producer.phone || '');
            setAddress(producer.address || '');
        } else {
            setName('');
            setContactPerson('');
            setPhone('');
            setAddress('');
        }
        setError('');
        setIsSaving(false);
    }, [producer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('Atölye adı zorunludur.');
            return;
        }

        setIsSaving(true);
        const producerData = {
            name: name.trim(),
            contactPerson: contactPerson.trim(),
            phone: phone.trim(),
            address: address.trim(),
        };

        try {
            if (isEditMode && producer?.id) {
                await onUpdate(producer.id, producerData);
            } else {
                const success = await onSave(producerData);
                if (!success) {
                    setError('Bu isimde bir atölye zaten mevcut.');
                    setIsSaving(false);
                    return;
                }
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg border border-border-color" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-border-color">
                        <h2 className="text-xl font-bold text-text-primary">{isEditMode ? 'Atölye Düzenle' : 'Yeni Atölye Ekle'}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Atölye Adı *</label>
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="contactPerson" className="block text-sm font-medium text-text-secondary mb-1">Yetkili Kişi</label>
                            <input type="text" id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">Telefon</label>
                            <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-text-secondary mb-1">Adres</label>
                            <textarea id="address" value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
                        </div>
                    </div>
                    <div className="p-6 flex justify-end gap-4 bg-background/50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-text-primary font-bold rounded-lg hover:bg-border-color transition-colors">İptal</button>
                        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50">
                            {isSaving ? 'Kaydediliyor...' : (isEditMode ? 'Güncelle' : 'Kaydet')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface ProducerDetailViewProps {
    producer: Producer;
    stats: ProducerPerformanceStat;
    orders: Order[];
    allStockEntries: StockEntry[];
    stockUsage: StockUsage[];
    cuttingReports: CuttingReport[];
    onClose: () => void;
    onViewOrderDetails: (groupId: string) => void;
}

const SizeBreakdown: React.FC<{ sizes: Sizes }> = ({ sizes }) => {
    const sizeEntries = SIZES_ORDER.map(size => ({ size, quantity: sizes[size] })).filter(
        item => item.quantity > 0
    );

    if (sizeEntries.length === 0) return null;

    return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
            {sizeEntries.map(({ size, quantity }) => (
                <div key={size}>
                    <span className="font-bold uppercase text-text-secondary">{size}</span>
                    <span className="ml-1 font-semibold text-primary">{quantity}</span>
                </div>
            ))}
        </div>
    );
};

const ProducerDetailView: React.FC<ProducerDetailViewProps> = ({ producer, stats, orders, allStockEntries, stockUsage, cuttingReports, onClose, onViewOrderDetails }) => {
    const [activeTab, setActiveTab] = useState('all');
    
    const [modelFilter, setModelFilter] = useState('');
    const [colorFilter, setColorFilter] = useState('');
    const [sizeFilter, setSizeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const allOrdersForProducer = useMemo(() => {
        return orders
            .filter(o => o.producer === producer.name)
            .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    }, [orders, producer.name]);
    
    const uniqueModels = useMemo(() => Array.from(new Set(allOrdersForProducer.map(o => o.productName))).sort(), [allOrdersForProducer]);
    const uniqueColors = useMemo(() => Array.from(new Set(allOrdersForProducer.map(o => o.color))).sort(), [allOrdersForProducer]);

    const filteredOrders = useMemo(() => {
        let filtered = [...allOrdersForProducer];
        
        if (startDate) {
            filtered = filtered.filter(o => o.createdDate.split('T')[0] >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(o => o.createdDate.split('T')[0] <= endDate);
        }
        if (modelFilter) {
            filtered = filtered.filter(o => o.productName === modelFilter);
        }
        if (colorFilter) {
            filtered = filtered.filter(o => o.color === colorFilter);
        }
        if (sizeFilter) {
            filtered = filtered.filter(o => o.sizes[sizeFilter as keyof Sizes] > 0);
        }
        
        return filtered;
    }, [allOrdersForProducer, startDate, endDate, modelFilter, colorFilter, sizeFilter]);
    
    const dynamicStats = useMemo(() => {
        const completed = filteredOrders.filter(o => o.status === 'Tamamlandı' && o.completionDate);
        const inProgressOrders = filteredOrders.filter(o => o.status === 'Devam Ediyor' || o.status === 'Kesim Bekleniyor').length;
        const totalQuantity = filteredOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

        const completionDays = completed.map(o => 
            (new Date(o.completionDate!).getTime() - new Date(o.createdDate).getTime()) / (1000 * 3600 * 24)
        );
        const avgCompletionDays = completionDays.length > 0 
            ? Math.round(completionDays.reduce((a, b) => a + b, 0) / completionDays.length)
            : null;

        return {
            completedOrders: completed.length,
            inProgressOrders,
            totalOrders: completed.length + inProgressOrders,
            totalQuantity,
            avgCompletionDays,
        };
    }, [filteredOrders]);

    const assignedOrders = useMemo(() => {
        return filteredOrders.filter(o => o.status === 'Devam Ediyor' || o.status === 'Kesim Bekleniyor');
    }, [filteredOrders]);

    const completedOrders = useMemo(() => {
        return filteredOrders
            .filter(o => o.status === 'Tamamlandı' && o.completionDate)
            .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime());
    }, [filteredOrders]);

    const defectReport = useMemo(() => {
        // Get all orders for the current producer to establish the scope of their work.
        const producerOrders = orders.filter(o => o.producer === producer.name);
        const producerGroupIds = new Set(producerOrders.map(o => o.groupId));
        const producerOrderIds = new Set(producerOrders.map(o => o.id));

        // 1. Calculate Total Cut for this producer within the date range.
        const totalCut = cuttingReports
            .filter(cr => {
                const reportDate = cr.date.split('T')[0];
                const isAfterStartDate = !startDate || reportDate >= startDate;
                const isBeforeEndDate = !endDate || reportDate <= endDate;
                return cr.isConfirmed && producerGroupIds.has(cr.groupId) && isAfterStartDate && isBeforeEndDate;
            })
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            .reduce((sum, report) => sum + Object.values(report.sizes).reduce((s, q) => s + Number(q), 0), 0);

        // 2. Calculate Defects recorded for this producer within the date range.
        const defectsByReason = new Map<string, number>();
        let totalDefects = 0;
        const stockEntryMap = new Map<string, StockEntry>(allStockEntries.map(se => [se.id, se]));

        // Find usage records linked to this producer's orders
        const producerUsage = stockUsage.filter(su => producerOrderIds.has(su.orderId));

        for (const usage of producerUsage) {
            const stockEntry = stockEntryMap.get(usage.stockEntryId);
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            const totalDefectiveUsed = Object.values(usage.usedDefectiveSizes).reduce((sum, qty) => sum + Number(qty), 0);

            // If defective items were used, check if the stock entry (defect record) date falls within the filter range.
            if (totalDefectiveUsed > 0 && stockEntry && stockEntry.defectReason) {
                const stockEntryDate = stockEntry.date.split('T')[0];
                const isAfterStartDate = !startDate || stockEntryDate >= startDate;
                const isBeforeEndDate = !endDate || stockEntryDate <= endDate;

                if (isAfterStartDate && isBeforeEndDate) {
                    const reason = stockEntry.defectReason;
                    defectsByReason.set(reason, (defectsByReason.get(reason) || 0) + totalDefectiveUsed);
                    totalDefects += totalDefectiveUsed;
                }
            }
        }
        
        const sortedDefects = Array.from(defectsByReason.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([reason, count]) => ({
                reason,
                count,
                percentage: totalDefects > 0 ? (count / totalDefects) * 100 : 0,
            }));

        const overallDefectPercentage = totalCut > 0 ? (totalDefects / totalCut) * 100 : 0;
        
        return { totalDefects, totalCut, overallDefectPercentage, sortedDefects };

    }, [producer.name, orders, allStockEntries, stockUsage, cuttingReports, startDate, endDate]);
    
    const calculateDuration = (start: string, end?: string): string => {
        if (!end) return '-';
        const duration = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 3600 * 24);
        if (duration < 1) return '<1 gün';
        return `${Math.round(duration)} gün`;
    };

    const handleDateFilter = (isoDate: string) => {
        if (!isoDate) return;
        const formattedDate = new Date(isoDate).toISOString().split('T')[0];
        setStartDate(formattedDate);
        setEndDate(formattedDate);
        // Reset other filters for a focused view
        setModelFilter('');
        setColorFilter('');
        setSizeFilter('');
    };

    const handleResetFilters = () => {
        setModelFilter('');
        setColorFilter('');
        setSizeFilter('');
        setStartDate('');
        setEndDate('');
    };
    
    const tabButtonClass = "px-4 py-2 text-sm font-medium transition-colors focus:outline-none";
    const activeTabClass = "border-b-2 border-primary text-primary";
    const inactiveTabClass = "text-text-secondary hover:text-text-primary border-b-2 border-transparent";
    
    return (
        <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
            <header className="flex items-start mb-6 pb-4 border-b border-border-color">
                <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors mr-2 flex-shrink-0">
                    <ArrowUturnLeftIcon className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <FactoryIcon className="w-8 h-8 text-primary"/>
                        {producer.name}
                    </h1>
                    <div className="text-sm text-text-secondary mt-2 space-y-1">
                        {producer.contactPerson && <p><strong>Yetkili:</strong> {producer.contactPerson}</p>}
                        {producer.phone && <p><strong>Telefon:</strong> {producer.phone}</p>}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 p-4 bg-background rounded-lg border border-border-color">
                <div className="flex items-center gap-2 xl:col-span-1">
                    <label htmlFor="start-date-ws" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Başlangıç:</label>
                    <input type="date" id="start-date-ws" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
                </div>
                <div className="flex items-center gap-2 xl:col-span-1">
                    <label htmlFor="end-date-ws" className="text-sm text-text-secondary flex-shrink-0 whitespace-nowrap">Bitiş:</label>
                    <input type="date" id="end-date-ws" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-border-color rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none flex-1 min-w-0"/>
                </div>
                <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none xl:col-span-1">
                    <option value="">Tüm Modeller</option>
                    {uniqueModels.map(model => <option key={model} value={model}>{model}</option>)}
                </select>
                <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none xl:col-span-1">
                    <option value="">Tüm Renkler</option>
                    {uniqueColors.map(color => <option key={color} value={color}>{color}</option>)}
                </select>
                <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none xl:col-span-1">
                    <option value="">Tüm Bedenler</option>
                    {SIZES_ORDER.map(size => <option key={size} value={size}>{size.toUpperCase()}</option>)}
                </select>
                <button onClick={handleResetFilters} className="px-4 py-2 bg-red-600/80 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors xl:col-span-1">
                    Filtreleri Temizle
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-background p-4 rounded-lg"><p className="text-xs text-text-secondary">Tamamlanan</p><p className="text-2xl font-bold text-secondary">{dynamicStats.completedOrders}</p></div>
                     <div className="bg-background p-4 rounded-lg"><p className="text-xs text-text-secondary">Devam Eden</p><p className="text-2xl font-bold text-yellow-500">{dynamicStats.inProgressOrders}</p></div>
                     <div className="bg-background p-4 rounded-lg"><p className="text-xs text-text-secondary">Toplam Sipariş</p><p className="text-2xl font-bold text-primary">{dynamicStats.totalOrders}</p></div>
                     <div className="bg-background p-4 rounded-lg"><p className="text-xs text-text-secondary">Ort. Süre</p><p className="text-2xl font-bold text-text-primary">{dynamicStats.avgCompletionDays ?? '-'} gün</p></div>
                </div>
                <div>
                     <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2"><TagIcon className="w-5 h-5 text-red-500" />Atölye Defo Dökümü</h3>
                     <div className="bg-background p-4 rounded-lg border border-border-color h-full flex flex-col">
                        {defectReport.totalCut > 0 || defectReport.totalDefects > 0 ? (
                        <>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm text-text-secondary">Toplam Defolu:</span>
                                <span className="font-bold text-2xl text-red-500">{defectReport.totalDefects.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-sm text-text-secondary">Toplam Kesilen:</span>
                                <span className="font-bold text-xl text-text-primary">{defectReport.totalCut.toLocaleString()}</span>
                            </div>

                             <div className="w-full bg-surface rounded-full h-2.5 mb-1">
                                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${defectReport.overallDefectPercentage}%` }}></div>
                            </div>
                            <p className="text-right text-sm text-red-400 font-semibold mb-3">{defectReport.overallDefectPercentage.toFixed(2)}% Defo Oranı</p>
                            
                            {defectReport.totalDefects > 0 && (
                            <ul className="space-y-2 mt-3 pt-3 border-t border-border-color text-sm flex-1">
                                {defectReport.sortedDefects.map(item => (
                                    <li key={item.reason}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-text-secondary">{item.reason}</span>
                                            <span className="font-semibold text-text-primary">{item.count} adet (%{item.percentage.toFixed(1)})</span>
                                        </div>
                                        <div className="w-full bg-surface rounded-full h-1.5">
                                            <div className="bg-red-500/70 h-1.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            )}
                        </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-text-secondary text-center">Filtrelerle eşleşen defolu ürün kaydı bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
             <div className="flex flex-col">
                <div className="flex border-b border-border-color mb-4">
                    <button onClick={() => setActiveTab('all')} className={`${tabButtonClass} ${activeTab === 'all' ? activeTabClass : inactiveTabClass}`}>
                        Tüm Siparişler ({filteredOrders.length})
                    </button>
                    <button onClick={() => setActiveTab('active')} className={`${tabButtonClass} ${activeTab === 'active' ? activeTabClass : inactiveTabClass}`}>
                        Aktif Siparişler ({assignedOrders.length})
                    </button>
                    <button onClick={() => setActiveTab('completed')} className={`${tabButtonClass} ${activeTab === 'completed' ? activeTabClass : inactiveTabClass}`}>
                        Tamamlanmış Siparişler ({completedOrders.length})
                    </button>
                </div>

                <div className="pr-2">
                    {activeTab === 'all' && (
                        <div className="space-y-3">
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <div key={order.id} className="bg-background p-3 rounded-md border border-border-color">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <button onClick={() => onViewOrderDetails(order.groupId)} className="font-mono text-left text-xs text-primary lowercase hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded-sm">
                                                {order.groupId}
                                            </button>
                                            <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1 mt-1">
                                                <p className="font-semibold text-text-primary">{order.productName} - {order.color}</p>
                                                <SizeBreakdown sizes={order.sizes} />
                                            </div>
                                            <p className="text-xs text-text-secondary mt-1">
                                                Sipariş Tarihi: <button onClick={() => handleDateFilter(order.createdDate)} className="hover:underline hover:text-primary transition-colors" title={`${new Date(order.createdDate).toLocaleDateString('tr-TR')} tarihli siparişleri filtrele`}>{new Date(order.createdDate).toLocaleDateString('tr-TR')}</button>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                                            <p className="text-sm font-bold text-secondary mt-2">{order.totalQuantity.toLocaleString()} adet</p>
                                        </div>
                                    </div>
                                </div>
                            )) : <p className="text-center text-sm text-text-secondary py-4">Filtrelerle eşleşen sipariş bulunamadı.</p>}
                        </div>
                    )}
                    {activeTab === 'active' && (
                         <div className="space-y-3">
                             {assignedOrders.length > 0 ? assignedOrders.map(order => (
                                <div key={order.id} className="bg-background p-3 rounded-md border border-border-color">
                                     <div className="flex justify-between items-start">
                                        <div>
                                            <button onClick={() => onViewOrderDetails(order.groupId)} className="font-mono text-left text-xs text-primary lowercase hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded-sm">
                                                {order.groupId}
                                            </button>
                                            <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1 mt-1">
                                                <p className="font-semibold text-text-primary">{order.productName} - {order.color}</p>
                                                <SizeBreakdown sizes={order.sizes} />
                                            </div>
                                             <p className="text-xs text-text-secondary mt-1">
                                                Sipariş Tarihi: <button onClick={() => handleDateFilter(order.createdDate)} className="hover:underline hover:text-primary transition-colors" title={`${new Date(order.createdDate).toLocaleDateString('tr-TR')} tarihli siparişleri filtrele`}>{new Date(order.createdDate).toLocaleDateString('tr-TR')}</button>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                                            <p className="text-sm font-bold text-secondary mt-2">{order.totalQuantity.toLocaleString()} adet</p>
                                        </div>
                                    </div>
                                </div>
                             )) : <p className="text-center text-sm text-text-secondary py-4">Aktif sipariş bulunamadı.</p>}
                         </div>
                    )}
                    {activeTab === 'completed' && (
                        <div className="space-y-3">
                            {completedOrders.length > 0 ? completedOrders.map(order => (
                                <div key={order.id} className="bg-background p-3 rounded-md border border-border-color">
                                    <div className="flex justify-between items-start">
                                        <div>
                                             <button onClick={() => onViewOrderDetails(order.groupId)} className="font-mono text-left text-xs text-primary lowercase hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded-sm">
                                                {order.groupId}
                                            </button>
                                             <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1 mt-1">
                                                <p className="font-semibold text-text-primary">{order.productName} - {order.color}</p>
                                                <SizeBreakdown sizes={order.sizes} />
                                            </div>
                                            <p className="text-xs text-text-secondary mt-1">
                                                Sipariş: <button onClick={() => handleDateFilter(order.createdDate)} className="hover:underline hover:text-primary transition-colors" title={`${new Date(order.createdDate).toLocaleDateString('tr-TR')} tarihli siparişleri filtrele`}>{new Date(order.createdDate).toLocaleDateString('tr-TR')}</button>
                                                <span className="mx-1">→</span>
                                                Tamamlanma: <button onClick={() => handleDateFilter(order.completionDate!)} className="hover:underline hover:text-primary transition-colors" title={`${new Date(order.completionDate!).toLocaleDateString('tr-TR')} tarihli siparişleri filtrele`}>{new Date(order.completionDate!).toLocaleDateString('tr-TR')}</button> ({calculateDuration(order.createdDate, order.completionDate)})
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                                            <p className="text-sm font-bold text-secondary mt-2">{order.totalQuantity.toLocaleString()} adet</p>
                                        </div>
                                    </div>
                                </div>
                            )) : <p className="text-center text-sm text-text-secondary py-4">Tamamlanmış sipariş bulunamadı.</p>}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

interface WorkshopManagementProps {
    producers: Producer[];
    producerPerformanceStats: ProducerPerformanceStat[];
    addProducer: (producerData: Omit<Producer, 'id'>) => Promise<boolean>;
    updateProducer: (id: number, producerData: Partial<Omit<Producer, 'id'>>) => Promise<void>;
    deleteProducer: (id: number) => void;
    orders: Order[];
    allStockEntries: StockEntry[];
    stockUsage: StockUsage[];
    cuttingReports: CuttingReport[];
    onViewOrderDetails: (groupId: string) => void;
}

const WorkshopManagement: React.FC<WorkshopManagementProps> = ({
    producers,
    producerPerformanceStats,
    addProducer,
    updateProducer,
    deleteProducer,
    orders,
    allStockEntries,
    stockUsage,
    cuttingReports,
    onViewOrderDetails
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProducer, setEditingProducer] = useState<Producer | null>(null);
    const [producerToDelete, setProducerToDelete] = useState<Producer | null>(null);
    const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);

    const openForm = (producer: Producer | null = null) => {
        setEditingProducer(producer);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingProducer(null);
    };
    
    const handleDeleteClick = (producer: Producer) => {
        setProducerToDelete(producer);
    };

    const confirmDelete = () => {
        if (producerToDelete?.id) {
            deleteProducer(producerToDelete.id);
        }
        setProducerToDelete(null);
    };

    const producerStatsMap = useMemo(() => {
        const map = new Map<string, ProducerPerformanceStat>();
        producerPerformanceStats.forEach(stat => map.set(stat.name, stat));
        return map;
    }, [producerPerformanceStats]);

    if(selectedProducer) {
        return (
            <ProducerDetailView
                producer={selectedProducer}
                stats={producerStatsMap.get(selectedProducer.name)!}
                orders={orders}
                allStockEntries={allStockEntries}
                stockUsage={stockUsage}
                cuttingReports={cuttingReports}
                onClose={() => setSelectedProducer(null)}
                onViewOrderDetails={onViewOrderDetails}
            />
        )
    }
    
    return (
        <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
            {!selectedProducer ? (
                <>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center"><UsersIcon className="w-8 h-8 mr-3"/>Atölye Yönetimi</h1>
                    <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                        <PlusIcon className="w-5 h-5" />
                        Yeni Atölye Ekle
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {producers.map((producer) => {
                        const stats = producerStatsMap.get(producer.name);
                        return (
                            <div key={producer.id} className="bg-background p-4 rounded-lg border border-border-color flex flex-col">
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                         <button onClick={() => setSelectedProducer(producer)} className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md">
                                            <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-2">
                                                <FactoryIcon className="w-5 h-5" />
                                                <span className="group-hover:underline">{producer.name}</span>
                                            </h2>
                                        </button>
                                    </div>
                                    {producer.contactPerson && <p className="text-sm text-text-secondary mt-1">{producer.contactPerson}</p>}
                                    {producer.phone && <p className="text-xs text-text-secondary mt-1">{producer.phone}</p>}
                                    
                                     <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                                        <div className="bg-surface/50 p-2 rounded-md">
                                            <p className="text-xs text-text-secondary">Tamamlanan</p>
                                            <p className="text-xl font-bold text-secondary flex items-center justify-center gap-2"><CheckCircleIcon className="w-5 h-5"/>{stats?.completedOrders ?? 0}</p>
                                        </div>
                                         <div className="bg-surface/50 p-2 rounded-md">
                                            <p className="text-xs text-text-secondary">Devam Eden</p>
                                            <p className="text-xl font-bold text-yellow-500 flex items-center justify-center gap-2"><ClockIcon className="w-5 h-5"/>{stats?.inProgressOrders ?? 0}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-border-color flex justify-end gap-2">
                                    <button onClick={() => openForm(producer)} className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors" title='Düzenle'>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteClick(producer)} className="p-2 text-red-500 hover:text-red-400 transition-colors" title='Sil'>
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
                </>
            ) : (
                <ProducerDetailView
                    producer={selectedProducer}
                    stats={producerStatsMap.get(selectedProducer.name)!}
                    orders={orders}
                    allStockEntries={allStockEntries}
                    stockUsage={stockUsage}
                    cuttingReports={cuttingReports}
                    onClose={() => setSelectedProducer(null)}
                    onViewOrderDetails={onViewOrderDetails}
                />
            )}


            {isFormOpen && (
                <ProducerFormModal 
                    producer={editingProducer} 
                    onClose={closeForm} 
                    onSave={addProducer} 
                    onUpdate={updateProducer}
                    producers={producers}
                />
            )}

            {producerToDelete && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setProducerToDelete(null)}>
                    <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md border border-border-color" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-text-primary">Atölyeyi Sil</h3>
                            <p className="mt-2 text-sm text-text-secondary">
                                <span className="font-semibold text-red-400">{producerToDelete.name}</span> atölyesini silmek istediğinizden emin misiniz?
                                { (producerStatsMap.get(producerToDelete.name)?.totalOrders || 0) > 0 && 
                                    <span className="block mt-2">Bu atölyeye atanmış <strong>{(producerStatsMap.get(producerToDelete.name)?.totalOrders || 0).toLocaleString()}</strong> adet sipariş bulunmaktadır. Silinirse bu siparişler "Atanmamış" olarak görünecektir.</span>
                                }
                                Bu işlem geri alınamaz.
                            </p>
                        </div>
                        <div className="p-4 flex justify-end gap-4 bg-background/50 rounded-b-xl">
                            <button onClick={() => setProducerToDelete(null)} className="px-4 py-2 text-text-primary font-bold rounded-lg hover:bg-border-color transition-colors">İptal</button>
                            <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default WorkshopManagement;
