import { useState, useEffect } from 'react';
import { useTablesStore } from '../stores/tablesStore';
import { useMenuStore } from '../stores/menuStore';
import {
  Plus,
  Search,
  Clock,
  Check,
  X,
  ChevronRight,
  Minus,
  Trash2,
  User,
  CreditCard,
} from 'lucide-react';
import clsx from 'clsx';

export default function OrdersPage() {
  const { tables, fetchTables } = useTablesStore();
  const { menu, fetchMenu } = useMenuStore();
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderStep, setOrderStep] = useState('table'); // 'table' | 'menu' | 'review'

  useEffect(() => {
    fetchTables();
    fetchMenu();
  }, []);

  const availableTables = tables.filter(
    (t) => t.status === 'available' || t.status === 'occupied'
  );

  const addToOrder = (item) => {
    const existing = currentOrder.find((i) => i.id === item.id);
    if (existing) {
      setCurrentOrder(
        currentOrder.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCurrentOrder([...currentOrder, { ...item, quantity: 1 }]);
    }
  };

  const removeFromOrder = (itemId) => {
    setCurrentOrder(currentOrder.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId, delta) => {
    setCurrentOrder(
      currentOrder
        .map((i) =>
          i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const orderTotal = currentOrder.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleSubmitOrder = () => {
    // TODO: Submit order to API
    console.log('Submitting order:', { table: selectedTable, items: currentOrder });
    setCurrentOrder([]);
    setSelectedTable(null);
    setOrderStep('table');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 animate-fade-in">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {['table', 'menu', 'review'].map((step, idx) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => {
                  if (step === 'table') setOrderStep('table');
                  if (step === 'menu' && selectedTable) setOrderStep('menu');
                  if (step === 'review' && currentOrder.length > 0) setOrderStep('review');
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                  orderStep === step
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-800 text-surface-400 hover:text-surface-100'
                )}
              >
                {step}
              </button>
              {idx < 2 && <ChevronRight className="w-4 h-4 text-surface-600 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden">
          {orderStep === 'table' && (
            <div className="h-full overflow-y-auto">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">
                Select a Table
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {availableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table);
                      setOrderStep('menu');
                    }}
                    className={clsx(
                      'card-interactive p-4 text-center',
                      'border-2',
                      table.status === 'available'
                        ? 'table-available'
                        : 'table-occupied'
                    )}
                  >
                    <p className="text-2xl font-bold">#{table.tableNumber}</p>
                    <p className="text-sm mt-1 opacity-75">
                      {table.capacity} seats
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {orderStep === 'menu' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-100">
                  Menu - Table #{selectedTable?.tableNumber}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6">
                {menu.map((category) => (
                  <div key={category.id}>
                    <h3 className="text-surface-400 font-medium mb-3">
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {category.items
                        ?.filter((item) => item.isAvailable)
                        .map((item) => (
                          <button
                            key={item.id}
                            onClick={() => addToOrder(item)}
                            className="card-interactive p-3 text-left"
                          >
                            <p className="font-medium text-surface-100 truncate">
                              {item.name}
                            </p>
                            <p className="text-primary-400 font-bold mt-1">
                              €{item.price.toFixed(2)}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {orderStep === 'review' && (
            <div className="h-full flex flex-col">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">
                Review Order - Table #{selectedTable?.tableNumber}
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3">
                {currentOrder.map((item) => (
                  <div
                    key={item.id}
                    className="card flex items-center justify-between p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-sm text-surface-400">
                        €{item.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="btn-icon btn-sm btn-secondary"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="btn-icon btn-sm btn-secondary"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="w-20 text-right font-bold text-surface-100">
                        €{(item.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromOrder(item.id)}
                        className="btn-icon btn-sm btn-ghost text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-surface-700 pt-4 mt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-surface-300">Total</span>
                  <span className="text-primary-400">€{orderTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleSubmitOrder}
                  className="btn-primary w-full mt-4 btn-lg"
                >
                  <Check className="w-5 h-5" />
                  Submit Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order summary sidebar (desktop) */}
      <div className="hidden lg:flex flex-col w-80 card">
        <h3 className="font-semibold text-surface-100 mb-4">Current Order</h3>

        {selectedTable && (
          <div className="flex items-center gap-2 p-3 bg-surface-800 rounded-lg mb-4">
            <User className="w-4 h-4 text-surface-400" />
            <span className="text-surface-300">Table #{selectedTable.tableNumber}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {currentOrder.length === 0 ? (
            <p className="text-surface-500 text-center py-8">No items added</p>
          ) : (
            currentOrder.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-surface-800"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-100 truncate">{item.name}</p>
                  <p className="text-xs text-surface-500">x{item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-surface-100">
                  €{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-surface-700 pt-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-surface-400">Items</span>
            <span className="text-surface-100">
              {currentOrder.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold">
            <span className="text-surface-100">Total</span>
            <span className="text-primary-400">€{orderTotal.toFixed(2)}</span>
          </div>

          {currentOrder.length > 0 && orderStep !== 'review' && (
            <button
              onClick={() => setOrderStep('review')}
              className="btn-primary w-full"
            >
              Review Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
