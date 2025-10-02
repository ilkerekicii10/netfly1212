import React, { useState, useEffect, useMemo } from 'react';
import { CuttingReport, Order, Sizes } from '../types';
import { ArrowUturnLeftIcon, CuttingIcon } from './icons/Icons';

interface CuttingReportFormProps {
    itemsToEdit: CuttingReport[];
    ordersForReport: Order[];
    onUpdate: (reportsToUpdate: CuttingReport[], totalCutSizes: Sizes, date: string) => void;
    onCancel: () => void;
    addToast: (message: string, options?: { type?: 'success' | 'error' | 'info' }) => void;
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };

const CuttingReportForm: React.FC<CuttingReportFormProps> = ({ itemsToEdit, ordersForReport, onUpdate, onCancel, addToast }) => {
    const [date, setDate] = useState('');
    const [cutSizes, setCutSizes] = useState<Sizes>({ ...emptySizes });

    const representativeItem = useMemo(() => itemsToEdit?.[0], [itemsToEdit]);
    const groupId = useMemo(() => representativeItem?.groupId || 'Bilinmiyor', [representativeItem]);

    const totalOrderedSizes = useMemo(() => {
        return ordersForReport.reduce((acc, order) => {
            SIZES_ORDER.forEach(size => {
                acc[size] = (acc[size] || 0) + (order.sizes[size] || 0);
            });
            return acc;
        }, { ...emptySizes } as Sizes);
    }, [ordersForReport]);

    useEffect(() => {
        if (itemsToEdit && itemsToEdit.length > 0) {
            // Use the date from the first report being edited
            setDate(new Date(itemsToEdit[0].date).toISOString().split('T')[0]);
            
            // Sum up the sizes from all reports for the same group and date
            const initialCutSizes = itemsToEdit.reduce((acc, report) => {
                SIZES_ORDER.forEach(size => {
                    acc[size] = (acc[size] || 0) + (report.sizes[size] || 0);
                });
                return acc;
            }, { ...emptySizes } as Sizes);
            setCutSizes(initialCutSizes);
        }
    }, [itemsToEdit]);

    const handleSizeChange = (size: keyof Sizes, value: string) => {
        setCutSizes(prevData => ({
            ...prevData,
            [size]: parseInt(value, 10) || 0
        }));
    };
    
    const handleFillFromOrder = () => {
        setCutSizes(totalOrderedSizes);
    };

    const totalCutQuantity = SIZES_ORDER.reduce((sum, size) => sum + (cutSizes[size] || 0), 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            addToast("Geçersiz tarih formatı. Lütfen YYYY-AA-GG formatında girin.", { type: 'error' });
            return;
        }

        if (totalCutQuantity === 0) {
            addToast("Toplam kesilen adet 0 olduğu için rapor onaylanamaz. Lütfen en az bir bedene adet girin.", { type: 'error' });
            return;
        }
        
        onUpdate(itemsToEdit, cutSizes, date);
    };
    
    if (!representativeItem) return null;

    return (
        <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <button type="button" onClick={onCancel} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors flex-shrink-0">
                <ArrowUturnLeftIcon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center">
                  <CuttingIcon className="w-8 h-8 mr-3 text-primary"/>
                  Kesim Raporu Düzenle
              </h1>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="space-y-6 pr-2">
                    {/* Read-only info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Emir No</label>
                            <p className="text-lg font-mono p-2 bg-background rounded-md lowercase">{groupId}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Model</label>
                            <p className="text-lg p-2 bg-background rounded-md">{representativeItem.productName}</p>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Renk</label>
                            <p className="text-lg p-2 bg-background rounded-md">{representativeItem.color}</p>
                        </div>
                    </div>
                    
                    {/* Editable Date */}
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-text-secondary mb-2">Kesim Tarihi</label>
                        <input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full md:w-1/3 bg-background border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                        />
                    </div>
                    
                    {/* Unified Sizes Input */}
                    <div className="p-4 bg-background rounded-lg border border-border-color">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-primary">Toplam Kesilen Adetler</h3>
                            <button
                                type="button"
                                onClick={handleFillFromOrder}
                                className="px-4 py-2 bg-secondary/80 text-white text-sm font-bold rounded-lg hover:bg-secondary transition-colors"
                            >
                                Siparişten Doldur
                            </button>
                        </div>
                         <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 items-end">
                            {SIZES_ORDER.map((size) => (
                                <div key={size}>
                                    <label htmlFor={`size-${size}`} className="block text-sm font-medium text-text-secondary mb-1 text-center uppercase">{size}</label>
                                    <p className="text-center text-sm text-text-secondary mb-2">
                                        İstenen: <span className="font-bold text-text-primary">{totalOrderedSizes[size] || 0}</span>
                                    </p>
                                    <input
                                        id={`size-${size}`}
                                        type="number"
                                        min="0"
                                        value={cutSizes[size]}
                                        onChange={(e) => handleSizeChange(size, e.target.value)}
                                        className="w-full bg-surface border border-border-color rounded-lg px-2 py-2 text-center text-lg focus:ring-1 focus:ring-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            ))}
                            <div className="text-center md:text-left">
                                <p className="text-text-secondary text-sm">Toplam Kesilen</p>
                                <p className="text-3xl font-bold text-secondary">{totalCutQuantity.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto pt-6 flex justify-end items-center gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        Raporu Güncelle
                    </button>
                </div>
            </form>
        </section>
    );
};

export default CuttingReportForm;