import React, { useState, useEffect } from 'react';
import { StockEntry, Sizes, DefectReason } from '../types';
import { ArrowUturnLeftIcon, BoxIcon, TrashIcon } from './icons/Icons';

type NewStockData = Omit<StockEntry, 'id'>;

interface StockEntryFormProps {
    colors: string[];
    defectReasons: DefectReason[];
    onSave?: (newEntries: NewStockData[]) => Promise<void>;
    addColor: (color: string) => Promise<boolean>;
    itemToEdit?: StockEntry;
    onUpdate?: (id: string, data: NewStockData) => Promise<void>;
    onCancel?: () => void;
    prefillData?: { productName: string; colors: string[] } | null;
    onBack?: () => void;
    addToast: (message: string, options?: { type?: 'success' | 'error' | 'info' }) => void;
}

type StockRow = {
    id: number;
    color: string;
    sizes: Sizes;
    isDefective: boolean;
    defectReason: string | '';
};

const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };
const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

const StockEntryForm: React.FC<StockEntryFormProps> = ({ colors, defectReasons, onSave, addColor, itemToEdit, onUpdate, onCancel, prefillData, onBack, addToast }) => {
    const isEditMode = !!itemToEdit;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [model, setModel] = useState('');
    const [rows, setRows] = useState<StockRow[]>([
        { id: 1, color: colors[0] || '', sizes: { ...emptySizes }, isDefective: false, defectReason: '' }
    ]);
    const [bulkSizes, setBulkSizes] = useState<Sizes>({ ...emptySizes });
    const [isAddingColor, setIsAddingColor] = useState(false);
    const [newColorInput, setNewColorInput] = useState('');

    const calculateRowTotal = (sizes: Sizes) => {
        return Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
    };

    useEffect(() => {
        if (isEditMode && itemToEdit) {
            setDate(itemToEdit.date.split('T')[0]);
            setModel(itemToEdit.productName);
            const isDefective = calculateRowTotal(itemToEdit.defectiveSizes) > 0;
            const sizes = isDefective ? itemToEdit.defectiveSizes : itemToEdit.normalSizes;
            setRows([{ 
                id: 1, 
                color: itemToEdit.color,
                sizes: sizes,
                isDefective: isDefective,
                defectReason: itemToEdit.defectReason || ''
            }]);
        } else if (prefillData) {
            setModel(prefillData.productName);
            const newRows = prefillData.colors.map((color, index) => ({
                id: index + 1,
                color: color,
                sizes: { ...emptySizes },
                isDefective: false,
                defectReason: ''
            }));
            setRows(newRows);
        }
    }, [isEditMode, itemToEdit, prefillData]);

    useEffect(() => {
        if (isEditMode || prefillData) return; // Don't reset if editing or prefilling
        if (colors && colors.length > 0) {
            setRows(currentRows =>
                currentRows.map(row =>
                    (!row.color || !colors.includes(row.color))
                        ? { ...row, color: colors[0] }
                        : row
                )
            );
        }
    }, [colors, isEditMode, prefillData]);


    const handleAddRow = () => {
        setRows(prevRows => [
            ...prevRows,
            { id: Date.now(), color: colors[0] || '', sizes: { ...emptySizes }, isDefective: false, defectReason: '' }
        ]);
    };

    const handleRemoveRow = (id: number) => {
        setRows(prevRows => prevRows.filter(row => row.id !== id));
    };

    const handleRowChange = (id: number, field: 'color' | 'isDefective' | 'defectReason' | keyof Sizes, value: string | boolean) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                if (field === 'color' && typeof value === 'string') {
                    return { ...row, color: value };
                }
                if (field === 'isDefective' && typeof value === 'boolean') {
                    return { ...row, isDefective: value, defectReason: value ? row.defectReason : '' };
                }
                if (field === 'defectReason' && typeof value === 'string') {
                    return { ...row, defectReason: value as string | '' };
                }
                if (typeof value === 'string' && SIZES_ORDER.includes(field as keyof Sizes)) {
                    const newSizes = { ...row.sizes, [field]: parseInt(value, 10) || 0 };
                    return { ...row, sizes: newSizes };
                }
            }
            return row;
        }));
    };
    
    const handleBulkSizeChange = (size: keyof Sizes, value: string) => {
        setBulkSizes(prev => ({ ...prev, [size]: parseInt(value, 10) || 0 }));
    };

    const handleApplyBulkSizesToAll = () => {
        if (isEditMode) return;
        setRows(rows.map(row => ({ ...row, sizes: { ...bulkSizes } })));
    };
    
    const handleSubmit = async () => {
        if (!model.trim()) {
            addToast("Lütfen bir model adı girin.", { type: 'error' });
            return;
        }
        
        const invalidDefectiveRow = rows.find(row => row.isDefective && !row.defectReason);
        if (invalidDefectiveRow) {
            addToast("Lütfen defolu olarak işaretlenen ürünler için bir defo sebebi seçin.", { type: 'error' });
            return;
        }
        
        if (isEditMode) {
            const row = rows[0];
            const updatedData: NewStockData = {
                date: date,
                productName: model.trim().toUpperCase(),
                color: row.color,
                producer: itemToEdit?.producer, // Preserve existing producer in edit mode
                normalSizes: !row.isDefective ? row.sizes : { ...emptySizes },
                defectiveSizes: row.isDefective ? row.sizes : { ...emptySizes },
                defectReason: row.isDefective ? row.defectReason : undefined
            };
            if (onUpdate && itemToEdit) {
                await onUpdate(itemToEdit.id, updatedData);
            }
        } else {
             const newEntries = rows
                .map(row => ({
                    date: date,
                    productName: model.trim().toUpperCase(),
                    color: row.color,
                    producer: undefined,
                    normalSizes: !row.isDefective ? row.sizes : { ...emptySizes },
                    defectiveSizes: row.isDefective ? row.sizes : { ...emptySizes },
                    defectReason: row.isDefective ? row.defectReason : undefined,
                }))
                .filter(entry => calculateRowTotal(entry.normalSizes) > 0 || calculateRowTotal(entry.defectiveSizes) > 0);

            if (newEntries.length === 0) {
                addToast("Kaydedilecek stok bulunmuyor. Lütfen en az bir ürüne adet girin.", { type: 'error' });
                return;
            }
            
            if (onSave) {
                try {
                    await onSave(newEntries);
                    addToast(`${newEntries.length} adet yeni stok kaydı başarıyla eklendi!`, { type: 'success' });
                    
                    // Reset form
                    setDate(new Date().toISOString().split('T')[0]);
                    setModel('');
                    setRows([{ id: 1, color: colors[0] || '', sizes: { ...emptySizes }, isDefective: false, defectReason: '' }]);
                    setBulkSizes({ ...emptySizes });
                } catch (error) {
                    console.error("Stok kaydetme başarısız:", error);
                    addToast("Stok kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.", { type: 'error' });
                }
            }
        }
    };
    
    const handleSaveNewColor = async () => {
        if (newColorInput.trim()) {
            const success = await addColor(newColorInput);
            if (success) {
                addToast(`'${newColorInput.trim().toUpperCase()}' rengi başarıyla eklendi.`, { type: 'success' });
            } else {
                addToast(`'${newColorInput.trim().toUpperCase()}' rengi zaten mevcut.`, { type: 'error' });
            }
            setNewColorInput('');
            setIsAddingColor(false);
        } else {
            addToast("Lütfen bir renk adı girin.", { type: 'error' });
        }
    };

    const handleCancelAddColor = () => {
        setNewColorInput('');
        setIsAddingColor(false);
    };
    
    return (
        <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                {(onBack || onCancel) && (
                  <button type="button" onClick={onBack || onCancel} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors flex-shrink-0">
                    <ArrowUturnLeftIcon className="h-6 w-6" />
                  </button>
                )}
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center">
                    <BoxIcon className="w-8 h-8 mr-3 text-primary"/>
                    {isEditMode ? `Stok Kaydı Düzenle` : 'Yeni Stok Girişi'}
                </h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                    <label htmlFor="date" className="block text-sm font-medium text-text-secondary mb-2">Tarih</label>
                    <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
                 <div>
                    <label htmlFor="model" className="block text-sm font-medium text-text-secondary mb-2">Model</label>
                     <input
                        id="model"
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Model adı girin (örn: FRENCH TERRY)"
                        className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                        disabled={isEditMode || !!prefillData}
                    />
                </div>
            </div>
            
            {!isEditMode && (
                <div className="mb-6 p-4 bg-background rounded-lg border border-border-color">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg text-primary">Toplu Adet Girişi</h3>
                        <button
                            type="button"
                            onClick={handleApplyBulkSizesToAll}
                            className="px-4 py-2 bg-secondary/80 text-white text-sm font-bold rounded-lg hover:bg-secondary transition-colors"
                        >
                            Tüm Satırlara Uygula
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                        {SIZES_ORDER.map(size => (
                            <div key={`bulk-${size}`}>
                                <label htmlFor={`bulk-${size}`} className="block text-sm font-medium text-text-secondary mb-1 text-center uppercase">{size}</label>
                                <input
                                    id={`bulk-${size}`}
                                    type="number"
                                    min="0"
                                    value={bulkSizes[size]}
                                    onChange={(e) => handleBulkSizeChange(size, e.target.value)}
                                    className="w-full bg-surface border border-border-color rounded-lg px-1 py-2 text-center text-sm focus:ring-1 focus:ring-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {rows.map(row => (
                <div key={row.id} className="bg-background p-4 rounded-lg border border-border-color">
                  <div className="flex justify-between items-center mb-4 gap-4">
                      <select 
                          value={row.color} 
                          onChange={(e) => handleRowChange(row.id, 'color', e.target.value)}
                          disabled={isEditMode || !!prefillData}
                          className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-base focus:ring-1 focus:ring-primary focus:outline-none appearance-none">
                          {colors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          disabled={isEditMode || !!prefillData || rows.length <= 1}
                          aria-label="Satırı Sil"
                      >
                          <TrashIcon className="h-6 w-6" />
                      </button>
                  </div>
                  {isEditMode && itemToEdit?.producer && (
                       <div className="mb-4">
                            <label className="block text-sm font-medium text-text-secondary mb-1">Üretici Atölye</label>
                            <p className="p-2 bg-surface rounded-md">{itemToEdit.producer}</p>
                       </div>
                  )}
                  <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input
                              type="checkbox"
                              checked={row.isDefective}
                              onChange={(e) => handleRowChange(row.id, 'isDefective', e.target.checked)}
                              className="h-5 w-5 rounded bg-surface border-text-secondary text-primary focus:ring-primary"
                          />
                          <span className={`font-medium ${row.isDefective ? 'text-red-400' : 'text-text-secondary'}`}>Defolu Ürün Girişi</span>
                      </label>
                  </div>
                  {row.isDefective && (
                        <div className="mb-4">
                            <label htmlFor={`defect-reason-mobile-${row.id}`} className="block text-sm font-medium text-text-secondary mb-1">Defo Sebebi</label>
                            <select
                                id={`defect-reason-mobile-${row.id}`}
                                value={row.defectReason}
                                onChange={(e) => handleRowChange(row.id, 'defectReason', e.target.value)}
                                className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-base focus:ring-1 focus:ring-red-500 focus:outline-none"
                                required
                            >
                                <option value="" disabled>Seçiniz...</option>
                                {defectReasons.map(reason => (
                                    <option key={reason.id} value={reason.name}>{reason.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                  <div className="grid grid-cols-3 gap-4">
                      {SIZES_ORDER.map(size => (
                          <div key={size}>
                              <label htmlFor={`mobile-stock-${row.id}-${size}`} className="block text-sm font-medium text-text-secondary mb-1 text-center uppercase">{size}</label>
                              <input
                                  id={`mobile-stock-${row.id}-${size}`}
                                  type="number"
                                  min="0"
                                  value={row.sizes[size]}
                                  onChange={(e) => handleRowChange(row.id, size, e.target.value)}
                                  className={`w-full bg-surface border border-border-color rounded-lg px-2 py-2 text-center text-lg focus:ring-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${row.isDefective ? 'text-red-500 focus:ring-red-500' : 'text-text-primary focus:ring-primary'}`}
                              />
                          </div>
                      ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border-color flex justify-between items-center">
                      <span className="text-text-secondary font-medium">Toplam:</span>
                      <span className="text-xl font-bold text-secondary">
                          {calculateRowTotal(row.sizes).toLocaleString()}
                      </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-background">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-48">Renk</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Defolu</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-48">Defo Sebebi</th>
                            {SIZES_ORDER.map(size => <th key={size} className="w-16 px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{size}</th>)}
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border-color">
                        {rows.map(row => (
                            <tr key={row.id}>
                                <td className="px-4 py-2">
                                    <select 
                                      value={row.color} 
                                      onChange={(e) => handleRowChange(row.id, 'color', e.target.value)}
                                      disabled={isEditMode || !!prefillData}
                                      className="w-full bg-background border border-border-color rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none appearance-none">
                                        {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-2 text-center">
                                     <input
                                        type="checkbox"
                                        checked={row.isDefective}
                                        onChange={(e) => handleRowChange(row.id, 'isDefective', e.target.checked)}
                                        className="h-5 w-5 rounded bg-background border-text-secondary text-primary focus:ring-primary"
                                        aria-label="Defolu olarak işaretle"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    {row.isDefective ? (
                                        <select
                                            value={row.defectReason}
                                            onChange={(e) => handleRowChange(row.id, 'defectReason', e.target.value)}
                                            className="w-full bg-background border border-border-color rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none appearance-none"
                                            required
                                        >
                                            <option value="" disabled>Seçiniz...</option>
                                            {defectReasons.map(reason => (
                                                <option key={reason.id} value={reason.name}>{reason.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-text-secondary text-sm pl-4">-</span>
                                    )}
                                </td>
                                {SIZES_ORDER.map(size => (
                                    <td key={`${row.id}-${size}`} className="px-1 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.sizes[size]}
                                            onChange={(e) => handleRowChange(row.id, size, e.target.value)}
                                            className={`w-16 bg-background border border-border-color rounded-lg px-1 py-2 text-center text-sm focus:ring-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${row.isDefective ? 'text-red-500 focus:ring-red-500' : 'text-text-primary focus:ring-primary'}`}
                                        />
                                    </td>
                                ))}
                                <td className="px-4 py-2 text-center text-sm font-bold text-secondary">
                                    {calculateRowTotal(row.sizes).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button
                                        onClick={() => handleRemoveRow(row.id)}
                                        className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isEditMode || !!prefillData || rows.length <= 1}
                                        aria-label="Satırı Sil"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <button
                        onClick={handleAddRow}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/50 rounded-lg hover:bg-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isEditMode || !!prefillData}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Satır Ekle
                    </button>
                    {!isAddingColor ? (
                        <button
                            onClick={() => setIsAddingColor(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/50 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                            Yeni Renk Tanımla
                        </button>
                    ) : (
                         <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border-color animate-fade-in">
                            <input
                                type="text"
                                value={newColorInput}
                                onChange={(e) => setNewColorInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveNewColor()}
                                placeholder="Yeni Renk Adı"
                                className="bg-surface border border-border-color rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                autoFocus
                            />
                            <button onClick={handleSaveNewColor} className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:bg-blue-700 transition-colors">Kaydet</button>
                            <button onClick={handleCancelAddColor} className="text-gray-400 hover:text-white transition-colors" aria-label="İptal">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                     {isEditMode && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            İptal
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        {isEditMode ? 'Güncelle' : 'Tümünü Kaydet'}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default StockEntryForm;