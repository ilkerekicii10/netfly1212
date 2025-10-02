import React, { useState, useEffect, useRef } from 'react';
import { Order, Sizes } from '../types';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon } from './icons/Icons';


type NewOrderData = Omit<Order, 'id' | 'status' | 'groupId'>;

interface OrderEntryProps {
    colors: string[];
    allOrders?: Order[]; 
    onSave?: (newOrders: NewOrderData[]) => void;
    addColor: (color: string) => Promise<boolean>;
    itemToEdit?: Order;
    onUpdate?: (originalOrders: Order[], newOrders: NewOrderData[]) => void;
    onCancel?: () => void;
    onBack?: () => void;
    addToast: (message: string, options?: { type?: 'success' | 'error' | 'info' }) => void;
}

type OrderRow = {
    id: number;
    color: string;
    sizes: Sizes;
};

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };


const OrderEntry: React.FC<OrderEntryProps> = ({ colors, allOrders = [], onSave, addColor, itemToEdit, onUpdate, onCancel, onBack, addToast }) => {
    const isEditMode = !!itemToEdit;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [model, setModel] = useState('');
    const [rows, setRows] = useState<OrderRow[]>([
        { id: 1, color: colors[0] || '', sizes: { ...emptySizes } }
    ]);
    const [bulkSizes, setBulkSizes] = useState<Sizes>({ ...emptySizes });
    const [originalOrdersForEdit, setOriginalOrdersForEdit] = useState<Order[]>([]);
    const [isAddingColor, setIsAddingColor] = useState(false);
    const [newColorInput, setNewColorInput] = useState('');
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const prevRowsLengthRef = useRef(rows.length);

    useEffect(() => {
        if (isEditMode && itemToEdit) {
            // Find all orders with the same groupId to populate the form
            const ordersInGroup = allOrders.filter(
              o => o.groupId === itemToEdit.groupId
            );
            setOriginalOrdersForEdit(ordersInGroup);

            // WITH NEW LOGIC: A group will only ever have one color, but might have multiple producers.
            // We sum up the sizes from all producer parts into one row for editing.
            const combinedSizes = ordersInGroup.reduce((acc, order) => {
                (Object.keys(order.sizes) as Array<keyof Sizes>).forEach(size => {
                    acc[size] = (acc[size] || 0) + (order.sizes[size] || 0);
                });
                return acc;
            }, { ...emptySizes } as Sizes);

            const newRows: OrderRow[] = [{
                id: Date.now(), // Unique ID for the row
                color: itemToEdit.color, // The color is fixed for the group
                sizes: combinedSizes
            }];

            setDate(itemToEdit.createdDate.split('T')[0]);
            setModel(itemToEdit.productName);
            setRows(newRows);
        }
    }, [isEditMode, itemToEdit, allOrders]);

    useEffect(() => {
        if (tableContainerRef.current && rows.length > prevRowsLengthRef.current) {
            const timer = setTimeout(() => {
                if (tableContainerRef.current) {
                    tableContainerRef.current.scrollTo({
                        top: tableContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
        prevRowsLengthRef.current = rows.length;
    }, [rows.length]);

    useEffect(() => {
        if (isEditMode) return; // Don't reset colors in edit mode
        if (colors && colors.length > 0) {
            setRows(currentRows => 
                currentRows.map(row => 
                    !row.color || !colors.includes(row.color) 
                        ? { ...row, color: colors[0] } 
                        : row
                )
            );
        }
    }, [colors, isEditMode]);

    const calculateTotalForRow = (sizes: Sizes) => {
        return SIZES_ORDER.reduce((sum, size) => sum + (sizes[size] || 0), 0);
    };

    const handleAddRow = () => {
        setRows(prevRows => [
            ...prevRows,
            { id: Date.now(), color: colors[0] || '', sizes: { ...emptySizes } }
        ]);
    };

    const handleRemoveRow = (id: number) => {
        setRows(prevRows => prevRows.filter(row => row.id !== id));
    };

    const handleRowChange = (id: number, field: 'color' | 'quantity', value: string, size?: keyof Sizes) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                if (field === 'color') {
                    return { ...row, color: value };
                }
                if (size && field === 'quantity') {
                    const newSizes = { ...row.sizes };
                    newSizes[size] = parseInt(value, 10) || 0;
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!model.trim()) {
            addToast("Lütfen bir model adı girin.", { type: 'error' });
            return;
        }
        
        const validRows = rows.filter(row => {
            const totalQuantity = SIZES_ORDER.reduce((sum, size) => sum + (row.sizes[size] || 0), 0);
            return row.color && totalQuantity > 0;
        });

        if (validRows.length === 0) {
            addToast("Kaydedilecek sipariş bulunmuyor. Lütfen en az bir renge adet girin.", { type: 'error' });
            return;
        }

        const newOrders: NewOrderData[] = validRows.map(row => {
            const totalQuantity = SIZES_ORDER.reduce((sum, size) => sum + (row.sizes[size] || 0), 0);
            return {
                createdDate: date,
                productName: model.trim().toUpperCase(),
                color: row.color,
                sizes: row.sizes,
                totalQuantity,
            };
        });

        if (isEditMode) {
            onUpdate?.(originalOrdersForEdit, newOrders);
            addToast('Sipariş başarıyla güncellendi!', { type: 'success' });
        } else {
            onSave?.(newOrders);
            addToast('Sipariş başarıyla kaydedildi!', { type: 'success' });
            // Reset form
            setDate(new Date().toISOString().split('T')[0]);
            setModel('');
            setRows([{ id: 1, color: colors[0] || '', sizes: { ...emptySizes } }]);
            setBulkSizes({ ...emptySizes });
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
                    <PlusCircleIcon className="w-8 h-8 mr-3 text-primary"/>
                    {isEditMode ? 'Sipariş Düzenle' : 'Yeni Sipariş Emri Girişi'}
                </h1>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-text-secondary mb-2">Tarih</label>
                        <input
                            id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-text-secondary mb-2">Model</label>
                        <input
                            id="model" type="text" value={model} onChange={(e) => setModel(e.target.value)}
                            placeholder="Model adı girin (örn: FRENCH TERRY)"
                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                            disabled={isEditMode}
                        />
                    </div>
                </div>

                {/* Bulk Entry */}
                <div className="mb-4 p-4 bg-background rounded-lg border border-border-color">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg text-primary">Toplu Adet Girişi (İsteğe Bağlı)</h3>
                        <button
                            type="button"
                            onClick={handleApplyBulkSizesToAll}
                            disabled={isEditMode}
                            className="px-4 py-2 bg-secondary/80 text-white text-sm font-bold rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tüm Renklere Uygula
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {SIZES_ORDER.map(size => (
                            <div key={size}>
                                <label htmlFor={`bulk-${size}`} className="block text-sm font-medium text-text-secondary mb-1 text-center uppercase">{size}</label>
                                <input
                                    id={`bulk-${size}`} type="number" min="0" value={bulkSizes[size]} onChange={(e) => handleBulkSizeChange(size, e.target.value)}
                                    disabled={isEditMode}
                                    className="w-full bg-surface border border-border-color rounded-lg px-1 py-2 text-center text-sm focus:ring-1 focus:ring-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-text-secondary mt-2">Buraya girilen adetleri "Tüm Renklere Uygula" butonu ile tüm satırlara atayabilirsiniz.</p>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {rows.map(row => (
                    <div key={row.id} className="bg-background p-4 rounded-lg border border-border-color">
                      <div className="flex justify-between items-center mb-4">
                          <select value={row.color} onChange={(e) => handleRowChange(row.id, 'color', e.target.value)} disabled={isEditMode} className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-base focus:ring-1 focus:ring-primary focus:outline-none appearance-none disabled:bg-background/50">
                              {colors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" onClick={() => handleRemoveRow(row.id)} disabled={rows.length <= 1 || isEditMode} className="ml-4 text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Satırı Sil">
                              <TrashIcon className="h-6 w-6" />
                          </button>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                          {SIZES_ORDER.map(size => (
                              <div key={size}>
                                  <label htmlFor={`mobile-size-${row.id}-${size}`} className="block text-sm font-medium text-text-secondary mb-1 text-center uppercase">{size}</label>
                                  <input
                                      id={`mobile-size-${row.id}-${size}`}
                                      type="number"
                                      min="0"
                                      value={row.sizes[size]}
                                      onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value, size)}
                                      className="w-full bg-surface border border-border-color rounded-lg px-2 py-2 text-center text-lg focus:ring-1 focus:ring-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                              </div>
                          ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border-color flex justify-between items-center">
                          <span className="text-text-secondary font-medium">Toplam:</span>
                          <span className="text-xl font-bold text-secondary">
                              {calculateTotalForRow(row.sizes).toLocaleString()}
                          </span>
                      </div>
                    </div>
                  ))}
                </div>


                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto" ref={tableContainerRef}>
                    <table className="min-w-full divide-y divide-border-color table-fixed">
                        <thead className="bg-background sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-48">Renk</th>
                                {SIZES_ORDER.map(size => <th key={size} className="w-16 px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{size}</th>)}
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border-color">
                            {rows.map(row => (
                                <tr key={row.id}>
                                    <td className="px-4 py-2">
                                        <select value={row.color} onChange={(e) => handleRowChange(row.id, 'color', e.target.value)} disabled={isEditMode} className="w-full bg-background border border-border-color rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none appearance-none disabled:bg-background/50">
                                            {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    {SIZES_ORDER.map(size => (
                                        <td key={`${row.id}-${size}`} className="px-1 py-2">
                                            <input
                                                type="number" min="0" value={row.sizes[size]} onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value, size)}
                                                className="w-16 bg-background border border-border-color rounded-lg px-1 py-2 text-center text-sm focus:ring-1 focus:ring-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-center text-sm font-bold text-secondary">
                                        {calculateTotalForRow(row.sizes).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button type="button" onClick={() => handleRemoveRow(row.id)} disabled={rows.length <= 1 || isEditMode} className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Satırı Sil">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-auto pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <button type="button" onClick={handleAddRow} disabled={isEditMode} className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/50 rounded-lg hover:bg-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Renk Ekle
                        </button>
                        {!isAddingColor ? (
                            <button type="button" onClick={() => setIsAddingColor(true)} disabled={isEditMode} className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/50 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                Yeni Renk Tanımla
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border-color animate-fade-in">
                                <input
                                    type="text" value={newColorInput} onChange={(e) => setNewColorInput(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNewColor()} placeholder="Yeni Renk Adı"
                                    className="bg-surface border border-border-color rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none" autoFocus
                                />
                                <button type="button" onClick={handleSaveNewColor} className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:bg-blue-700 transition-colors">Kaydet</button>
                                <button type="button" onClick={handleCancelAddColor} className="text-gray-400 hover:text-white transition-colors" aria-label="İptal">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {isEditMode && (
                            <button type="button" onClick={onCancel} className="px-6 py-3 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                                İptal
                            </button>
                        )}
                        <button type="submit" className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
                            {isEditMode ? 'Siparişi Güncelle' : 'Siparişi Kaydet'}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
};

export default OrderEntry;