import React, { useRef, useState } from 'react';
import { DatabaseIcon, InformationCircleIcon } from './icons/Icons';

interface DataManagementProps {
    onImport: (data: any) => Promise<boolean>;
    addToast: (message: string, options?: { type?: 'success' | 'error' | 'info' }) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onImport, addToast }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleExport = async () => {
         try {
            const response = await fetch('/api/export');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const dataToExport = await response.json();
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `los_ojos_backup_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            addToast("Veri dışa aktarılırken bir hata oluştu.", { type: 'error' });
        }
    };

    const processFile = (file: File) => {
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error("Dosya okunamadı.");
                    
                    const importedData = JSON.parse(text);

                    // Basic validation
                    if (!importedData.orders || !importedData.allStockEntries || !importedData.colors || !importedData.producers) {
                        throw new Error("Geçersiz dosya formatı. Gerekli alanlar (orders, allStockEntries, colors, producers) eksik.");
                    }

                    if (window.confirm("Mevcut tüm veriler bu yedeklemedeki verilerle değiştirilecektir. Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?")) {
                       const success = await onImport(importedData);
                       if (success) {
                           addToast("Veriler başarıyla içe aktarıldı! Sayfa yenileniyor...", { type: 'success' });
                           setTimeout(() => window.location.reload(), 2000);
                       } else {
                           addToast("İçe aktarma başarısız. Lütfen dosya formatını veya sunucu durumunu kontrol edin.", { type: 'error' });
                       }
                    }
                } catch (error: any) {
                    addToast(`Geçersiz JSON: ${error.message}`, { type: 'error' });
                    console.error("Import Error:", error);
                }
            };
            reader.readAsText(file);
        } else {
            addToast("Lütfen geçerli bir JSON dosyası seçin.", { type: 'error' });
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
        if(event.target) event.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    return (
        <section className="bg-surface p-6 rounded-xl shadow-lg border border-border-color flex flex-col gap-8">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center">
                    <DatabaseIcon className="w-8 h-8 mr-3 text-primary" />
                    Veri Yönetimi
                </h1>
                <p className="mt-2 text-text-secondary">Uygulama verilerinizi yedekleyin veya geri yükleyin.</p>
            </header>

            <div className="p-6 bg-background rounded-lg border border-border-color">
                <h2 className="text-xl font-bold text-text-primary">Verileri Dışa Aktar</h2>
                <p className="mt-2 text-sm text-text-secondary mb-4">
                    Uygulamadaki tüm verilerinizi tek bir JSON dosyası olarak bilgisayarınıza indirin. Bu dosyayı yedek olarak saklayabilirsiniz.
                </p>
                <button
                    onClick={handleExport}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Yedekleme Dosyasını İndir
                </button>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border-color">
                <h2 className="text-xl font-bold text-text-primary">Verileri İçe Aktar</h2>
                <div className="mt-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-md flex items-start gap-3">
                    <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="font-semibold">Uyarı:</strong> Bu işlem mevcut tüm verilerinizi seçeceğiniz dosyadaki verilerle <strong className="underline">kalıcı olarak</strong> değiştirecektir. İçe aktarma yapmadan önce mevcut verilerinizi dışa aktararak yedeklemeniz şiddetle tavsiye edilir.
                    </div>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border-color hover:border-primary/50'}`}
                >
                    <p className="text-text-secondary">Yedekleme dosyasını (.json) buraya sürükleyin</p>
                    <p className="text-sm text-text-secondary/80 my-2">veya</p>
                    <button type="button" className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors">
                        Dosya Seç
                    </button>
                </div>
            </div>
        </section>
    );
};

export default DataManagement;