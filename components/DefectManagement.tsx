
import React, { useState, useMemo } from 'react';
import { DefectReason, StockEntry, Order, Sizes, StockUsage } from '../types';
import { TagIcon, PlusIcon, TrashIcon, FactoryIcon } from './icons/Icons';

interface DefectReasonFormModalProps {
    reason: DefectReason | null;
    onClose: () => void;
    onSave: (name: string) => Promise<boolean>;
    onUpdate: (id: number, name: string) => Promise<void>;
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

const DefectReasonFormModal: React.FC<DefectReasonFormModalProps> = ({ reason, onClose, onSave, onUpdate }) => {
    const [name, setName] = useState(reason?.name || '');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = !!reason;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('Defo nedeni adı zorunludur.');
            return;
        }

        setIsSaving(true);
        try {
            if (isEditMode && reason?.id) {
                await onUpdate(reason.id, name);
            } else {
                const success = await onSave(name);
                if (!success) {
                    setError('Bu isimde bir neden zaten mevcut.');
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
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md border border-border-color" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-border-color">
                        <h2 className="text-xl font-bold text-text-primary">{isEditMode ? 'Defo Nedenini Düzenle' : 'Yeni Defo Nedeni Ekle'}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Neden Adı *</label>
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required autoFocus className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none" />
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

interface DefectManagementProps {
    defectReasons: DefectReason[];
    addDefectReason: (name: string) => Promise<boolean>;
    updateDefectReason: (id: number, newName: string) => Promise<void>;
    deleteDefectReason: (id: number) => void;
    allStockEntries: StockEntry[];
    orders: Order[];
    stockUsage: StockUsage[];
}

const DefectManagement: React.FC<DefectManagementProps> = ({ defectReasons, addDefectReason, updateDefectReason, deleteDefectReason, allStockEntries, orders, stockUsage }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReason, setEditingReason] = useState<DefectReason | null>(null);
    const [reasonToDelete, setReasonToDelete] = useState<DefectReason | null>(null);

    const usageData = useMemo(() => {
        // New logic using stockUsage for precise attribution
        const data = new Map<string, { total: number; byProducer: Record<string, number> }>();
        
        // Create maps for faster lookups
        const orderMap = new Map<string, Order>(orders.map(o => [o.id, o]));
        const stockEntryMap = new Map<string, StockEntry>(allStockEntries.map(se => [se.id, se]));

        for (const usage of stockUsage) {
            const order = orderMap.get(usage.orderId);
            const stockEntry = stockEntryMap.get(usage.stockEntryId);

            // Skip if usage is for a normal entry or data is missing
            if (!order || !stockEntry) continue;

            // We only care about the defective items that were used.
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            const totalDefectiveUsed = Object.values(usage.usedDefectiveSizes).reduce((sum, qty) => sum + Number(qty), 0);

            if (totalDefectiveUsed > 0 && stockEntry.defectReason) {
                 const reason = stockEntry.defectReason;
                 const producerName = order.producer || 'Atanmamış';
                 
                 if (!data.has(reason)) {
                     data.set(reason, { total: 0, byProducer: {} });
                 }
                 const reasonData = data.get(reason)!;
                 
                 reasonData.total += totalDefectiveUsed;
                 reasonData.byProducer[producerName] = (reasonData.byProducer[producerName] || 0) + totalDefectiveUsed;
            }
        }
        return data;
    }, [allStockEntries, orders, stockUsage]);

    const openForm = (reason: DefectReason | null = null) => {
        setEditingReason(reason);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingReason(null);
    };
    
    const handleDeleteClick = (reason: DefectReason) => {
        setReasonToDelete(reason);
    };

    const confirmDelete = () => {
        if (reasonToDelete?.id) {
            deleteDefectReason(reasonToDelete.id);
        }
        setReasonToDelete(null);
    };

    return (
        <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center"><TagIcon className="w-8 h-8 mr-3"/>Defo Detayları</h1>
                <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                    <PlusIcon className="w-5 h-5" />
                    Yeni Neden Ekle
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-background">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Defo Nedeni</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Atölye Dağılımı (Adet)</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam Adet</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border-color">
                        {defectReasons.map((reason) => {
                            const data = usageData.get(reason.name);
                            const totalUsage = data?.total || 0;
                            const producerBreakdown = data?.byProducer || {};
                            const sortedProducers = Object.entries(producerBreakdown).sort(([, a], [, b]) => b - a);

                            return (
                                <tr key={reason.id} className="hover:bg-background/50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{reason.name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {sortedProducers.length > 0 ? (
                                            <ul className="space-y-1">
                                                {sortedProducers.map(([producer, count]) => (
                                                    <li key={producer} className="flex items-center gap-2">
                                                        <FactoryIcon className="w-4 h-4 text-text-secondary/70"/>
                                                        <span>{producer}:</span>
                                                        <span className="font-semibold text-red-400">{count.toLocaleString()}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-bold text-red-400">{totalUsage.toLocaleString()}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => openForm(reason)} className="text-yellow-400 hover:text-yellow-300" title='Düzenle'>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDeleteClick(reason)} className="text-red-500 hover:text-red-400" title='Sil'>
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isFormOpen && (
                <DefectReasonFormModal 
                    reason={editingReason} 
                    onClose={closeForm} 
                    onSave={addDefectReason} 
                    onUpdate={updateDefectReason}
                />
            )}

            {reasonToDelete && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setReasonToDelete(null)}>
                    <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md border border-border-color" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-text-primary">Defo Nedenini Sil</h3>
                            <p className="mt-2 text-sm text-text-secondary">
                                <span className="font-semibold text-red-400">{reasonToDelete.name}</span> nedenini silmek istediğinizden emin misiniz?
                                { (usageData.get(reasonToDelete.name)?.total || 0) > 0 && 
                                    <span className="block mt-2">Bu neden, <strong>{(usageData.get(reasonToDelete.name)?.total || 0).toLocaleString()}</strong> adet defolu üründe kullanılıyor. Silinirse bu kayıtlardaki defo nedeni bilgisi kaldırılacaktır.</span>
                                }
                                Bu işlem geri alınamaz.
                            </p>
                        </div>
                        <div className="p-4 flex justify-end gap-4 bg-background/50 rounded-b-xl">
                            <button onClick={() => setReasonToDelete(null)} className="px-4 py-2 text-text-primary font-bold rounded-lg hover:bg-border-color transition-colors">İptal</button>
                            <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default DefectManagement;
