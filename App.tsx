import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import OrderList from './components/OrderList';
import CuttingReportComponent from './components/CuttingReport';
import StockRecords from './components/StockRecords';
import OrderDetail from './components/OrderDetail';
import OrderEntry from './components/OrderEntry';
import StockEntryForm from './components/StockEntryForm';
import CuttingReportForm from './components/CuttingReportForm';
import CuttingReportDetail from './components/CuttingReportDetail';
import WorkshopManagement from './components/WorkshopManagement';
import DefectManagement from './components/DefectManagement';
import DataManagement from './components/DataManagement';
import { useTextileData } from './hooks/useTextileData';
import { Order, StockEntry, CuttingReport, Sizes, Theme, Producer, View } from './types';
import { ArrowUturnLeftIcon, FactoryIcon, MenuIcon, CheckCircleIcon, ExclamationIcon, InformationCircleIcon } from './components/icons/Icons';

// Define which views are navigable via URL
const VALID_VIEWS: Readonly<View[]> = ['dashboard', 'orders', 'orderDetail', 'cuttingReport', 'stockRecords', 'orderEntry', 'stockEntry', 'editOrder', 'editStockEntry', 'editCuttingReport', 'workshopManagement', 'defectManagement', 'dataManagement', 'cuttingReportDetail'];

// Helper to get a valid view and optional ID from the URL path
const parsePath = (): { view: View, id: string | null } => {
    const parts = window.location.pathname.substring(1).split('/');
    const view = parts[0] === '' ? 'dashboard' : parts[0];
    const id = parts[1] || null;

    if (VALID_VIEWS.includes(view as View)) {
        return { view: view as View, id };
    }
    return { view: 'dashboard', id: null };
};


interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'undo';
  onUndo?: () => void;
}

type EditableItem = Order | StockEntry | CuttingReport | CuttingReport[];

const Toast: React.FC<{ toast: ToastState; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const duration = toast.type === 'undo' ? 5000 : toast.type === 'error' ? 3000 : 1500;
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, duration);

        return () => {
            clearTimeout(timer);
        };
    }, [toast, onDismiss]);

    const handleUndo = () => {
        if (toast.onUndo) {
            toast.onUndo();
        }
        onDismiss(toast.id);
    };

    const toastStyles = {
        success: 'bg-secondary/95 text-white border-green-400',
        error: 'bg-red-600/95 text-white border-red-400',
        info: 'bg-blue-600/95 text-white border-blue-400',
        undo: 'bg-surface text-text-primary border-border-color'
    };
    
    const Icon = {
      success: <CheckCircleIcon className="w-6 h-6 text-white" />,
      error: <ExclamationIcon className="w-6 h-6 text-white" />,
      info: <InformationCircleIcon className="w-6 h-6 text-white" />,
      undo: null
    }[toast.type];

    return (
        <div className={`w-full max-w-sm p-4 rounded-lg shadow-2xl border flex items-center gap-4 animate-fade-in-up ${toastStyles[toast.type]}`}>
            {Icon}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            {toast.type === 'undo' && toast.onUndo && (
                <button
                    onClick={handleUndo}
                    className="flex-shrink-0 flex items-center gap-1.5 font-bold text-sm text-primary hover:underline"
                >
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    Geri Al
                </button>
            )}
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-current opacity-70 hover:opacity-100 absolute top-1.5 right-1.5"
                aria-label="Kapat"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};


const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(parsePath().view);
  const [selectedId, setSelectedId] = useState<string | null>(parsePath().id);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [stockEntryPrefill, setStockEntryPrefill] = useState<{ productName: string; colors: string[] } | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, options: { type?: ToastState['type'], onUndo?: () => void } = {}) => {
      const { type = 'info', onUndo } = options;
      const id = Date.now() + Math.random();
      const finalType = onUndo ? 'undo' : type;
      setToasts(prev => [...prev, { id, message, type: finalType, onUndo }]);
  }, []);

  const { 
    orders, 
    stats,
    producerPerformanceStats,
    stockEntries, 
    allStockEntries,
    cuttingReports, 
    stockUsage, 
    colors,
    producers,
    defectReasons,
    addOrders, 
    syncProductColorOrders,
    deleteOrderGroup,
    addStockEntries, 
    updateStockEntry,
    archiveStockEntry,
    restoreStockEntry,
    updateCuttingReports,
    addColor,
    addProducer,
    updateProducer,
    deleteProducer,
    reassignMultipleParts,
    addDefectReason,
    updateDefectReason,
    deleteDefectReason,
    importData,
  } = useTextileData(addToast);

  const colorNames = useMemo(() => colors.map(c => c.name), [colors]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleArchiveStockEntry = (entryId: string) => {
    archiveStockEntry(entryId);
    addToast('Stok kaydı arşivlendi.', { onUndo: () => restoreStockEntry(entryId) });
  };
  
  const navigateTo = useCallback((view: View, id: string | null = null) => {
    const { view: currentView, id: currentId } = parsePath();
    if (view === currentView && id === currentId) return;

    let path = view === 'dashboard' ? '/' : `/${view}`;
    if (id) {
        path += `/${id}`;
    }
    window.history.pushState({ view, id }, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Effect to handle URL changes (e.g., back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
        const { view, id } = parsePath();
        setActiveView(view);
        setSelectedId(id);
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // Sync state on initial load
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Effect to find and set the item being edited based on the active view and ID
  useEffect(() => {
    if (activeView === 'editOrder' && selectedId) {
        if (orders.length > 0) {
            const orderToEdit = orders.find(o => o.groupId === selectedId);
            if (orderToEdit) setEditingItem(orderToEdit);
        }
    } else if (activeView === 'editStockEntry' && selectedId) {
        if (stockEntries.length > 0) {
            const stockToEdit = stockEntries.find(s => s.id === selectedId);
            if (stockToEdit) setEditingItem(stockToEdit);
        }
    } else if (activeView === 'editCuttingReport' && selectedId) {
         if (cuttingReports.length > 0) {
            const reportsToEdit = cuttingReports.filter(r => r.groupId === selectedId);
            if (reportsToEdit.length > 0) setEditingItem(reportsToEdit);
        }
    } else {
      setEditingItem(null);
    }
  }, [activeView, selectedId, orders, stockEntries, cuttingReports]);
  
  const handleDeleteOrder = (groupId: string) => {
    deleteOrderGroup(groupId);
  };

  const ordersForEditingReport = useMemo(() => {
    if (activeView !== 'editCuttingReport' || !editingItem || !Array.isArray(editingItem)) {
        return [];
    }
    const reportItems = editingItem as CuttingReport[];
    if (reportItems.length === 0) return [];

    const groupId = reportItems[0].groupId;
    
    return orders.filter(o => o.groupId === groupId);
  }, [activeView, editingItem, orders]);
  
  const handleSelectOrder = (groupId: string) => {
    navigateTo('orderDetail', groupId);
  };
  
  const handleCloseDetail = () => {
    navigateTo('orders');
  };
  
  const handleSelectCuttingReport = (key: string) => {
    navigateTo('cuttingReportDetail', key);
  };

  const handleEditItem = (item: EditableItem) => {
    if (item.hasOwnProperty('groupId') && !Array.isArray(item)) {
        const orderItem = item as Order;
        navigateTo('editOrder', orderItem.groupId);
    } else if (Array.isArray(item)) {
        const reportItems = item as CuttingReport[];
        if (reportItems.length > 0) {
            navigateTo('editCuttingReport', reportItems[0].groupId);
        }
    } else if (item.hasOwnProperty('defectiveSizes')) {
        navigateTo('editStockEntry', (item as StockEntry).id);
    }
  };
  
  const handleCancelEdit = () => {
    if (activeView === 'editOrder') navigateTo('orders');
    else if (activeView === 'editStockEntry') navigateTo('stockRecords');
    else if (activeView === 'editCuttingReport') navigateTo('cuttingReport');
    else navigateTo('dashboard');
  };
  
  const handleUpdateCuttingReport = async (reports: CuttingReport[], sizes: Sizes, date: string) => {
      await updateCuttingReports(reports, sizes, date);
      addToast('Kesim raporu başarıyla güncellendi!', { type: 'success' });
      handleCancelEdit();
  };

  const handleUpdateStockEntry = async (id: string, data: Omit<StockEntry, 'id'>) => {
    await updateStockEntry(id, data);
    addToast('Stok kaydı başarıyla güncellendi!', { type: 'success' });
    handleCancelEdit();
  };

  const handleCreateStockEntryFromOrder = (productName: string, colors: string[]) => {
    setStockEntryPrefill({ productName, colors });
    navigateTo('stockEntry');
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'orders':
        return <OrderList orders={orders} producers={producers} onViewDetails={handleSelectOrder} onEdit={handleEditItem} onDelete={handleDeleteOrder} onCreateStockEntry={handleCreateStockEntryFromOrder} />;
      case 'orderDetail': {
        const selectedOrderGroup = selectedId ? orders.filter(order => order.groupId === selectedId) : [];
        if (!selectedId || selectedOrderGroup.length === 0) {
            return <div className="text-center p-8"><p className="text-text-secondary">Sipariş bulunamadı veya yükleniyor...</p></div>;
        }
        return <OrderDetail orders={selectedOrderGroup} stockUsage={stockUsage} cuttingReports={cuttingReports} stockEntries={stockEntries} producers={producers} onClose={handleCloseDetail} onReassign={reassignMultipleParts} onViewCuttingReport={(id) => navigateTo('cuttingReportDetail', id)} addToast={addToast} />
      }
      case 'cuttingReport':
        return <CuttingReportComponent reports={cuttingReports} orders={orders} onViewDetails={handleSelectCuttingReport} onEdit={handleEditItem} />;
      case 'cuttingReportDetail': {
        const reportGroup = selectedId ? cuttingReports.filter(r => r.groupId === selectedId) : [];
        if (!selectedId || reportGroup.length === 0) {
            return <div className="text-center p-8"><p className="text-text-secondary">Rapor bulunamadı veya yükleniyor...</p></div>;
        }
        return <CuttingReportDetail reports={reportGroup} orders={orders} onClose={() => navigateTo('cuttingReport')} />
      }
      case 'stockRecords':
        return <StockRecords entries={stockEntries} onEdit={handleEditItem} onArchive={handleArchiveStockEntry} stockUsage={stockUsage} />;
      case 'orderEntry':
        return <OrderEntry colors={colorNames} allOrders={orders} onSave={addOrders} addColor={addColor} onBack={() => navigateTo('orders')} addToast={addToast} />;
      case 'stockEntry':
        return <StockEntryForm colors={colorNames} defectReasons={defectReasons} onSave={addStockEntries} addColor={addColor} prefillData={stockEntryPrefill} onBack={() => { setStockEntryPrefill(null); navigateTo('stockRecords'); }} addToast={addToast} />;
      case 'editOrder':
        return editingItem ? <OrderEntry colors={colorNames} allOrders={orders} itemToEdit={editingItem as Order} onUpdate={syncProductColorOrders} onCancel={handleCancelEdit} addColor={addColor} addToast={addToast}/> : null;
      case 'editStockEntry':
          return editingItem ? <StockEntryForm colors={colorNames} defectReasons={defectReasons} itemToEdit={editingItem as StockEntry} onUpdate={handleUpdateStockEntry} onCancel={handleCancelEdit} addColor={addColor} addToast={addToast} /> : null;
      case 'editCuttingReport':
        return editingItem ? <CuttingReportForm itemsToEdit={editingItem as CuttingReport[]} ordersForReport={ordersForEditingReport} onUpdate={handleUpdateCuttingReport} onCancel={handleCancelEdit} addToast={addToast}/> : null;
      case 'workshopManagement':
        return <WorkshopManagement producers={producers} producerPerformanceStats={producerPerformanceStats} addProducer={addProducer} updateProducer={updateProducer} deleteProducer={deleteProducer} orders={orders} allStockEntries={allStockEntries} stockUsage={stockUsage} cuttingReports={cuttingReports} onViewOrderDetails={handleSelectOrder} />;
      case 'defectManagement':
        return <DefectManagement defectReasons={defectReasons} addDefectReason={addDefectReason} updateDefectReason={updateDefectReason} deleteDefectReason={deleteDefectReason} allStockEntries={allStockEntries} orders={orders} stockUsage={stockUsage} />;
      case 'dataManagement':
        return <DataManagement onImport={importData} addToast={addToast} />
      case 'dashboard':
      default:
        return <Dashboard stats={stats} orders={orders} producerPerformanceStats={producerPerformanceStats} stockUsage={stockUsage} cuttingReports={cuttingReports} navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <Sidebar activeView={activeView} navigateTo={navigateTo} theme={theme} toggleTheme={toggleTheme} isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      
      <button onClick={() => setSidebarOpen(true)} className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-surface/80 backdrop-blur-sm rounded-md border border-border-color">
          <MenuIcon className="h-6 w-6"/>
      </button>

      <main className={`flex-1 p-4 sm:p-6 transition-all duration-300 lg:ml-64`}>
        {renderActiveView()}
      </main>
      
       <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 w-full max-w-sm">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
       </div>
    </div>
  );
};

export default App;
