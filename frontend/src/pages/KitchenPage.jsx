import { useState, useEffect } from 'react';
import { updateOrderItemStatus } from '../services/socket';
import {
  Clock,
  Check,
  ChefHat,
  Bell,
  Timer,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

// Mock data for demo - replace with real API
const MOCK_ORDERS = [
  {
    id: '1',
    orderNumber: '20241130-0001',
    tableNumber: '5',
    status: 'preparing',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    items: [
      { id: '1a', name: 'Margherita Pizza', quantity: 2, status: 'preparing', notes: 'Extra cheese' },
      { id: '1b', name: 'Caesar Salad', quantity: 1, status: 'ready' },
      { id: '1c', name: 'Spaghetti Carbonara', quantity: 1, status: 'pending' },
    ],
  },
  {
    id: '2',
    orderNumber: '20241130-0002',
    tableNumber: '3',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    items: [
      { id: '2a', name: 'Grilled Salmon', quantity: 1, status: 'pending' },
      { id: '2b', name: 'Tiramisu', quantity: 2, status: 'pending' },
    ],
  },
  {
    id: '3',
    orderNumber: '20241130-0003',
    tableNumber: '8',
    status: 'preparing',
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
    items: [
      { id: '3a', name: 'Beef Burger', quantity: 3, status: 'ready' },
      { id: '3b', name: 'French Fries', quantity: 3, status: 'ready' },
    ],
  },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', class: 'order-pending', next: 'preparing' },
  preparing: { label: 'Preparing', class: 'order-preparing', next: 'ready' },
  ready: { label: 'Ready', class: 'order-ready', next: 'served' },
  served: { label: 'Served', class: 'order-served', next: null },
};

export default function KitchenPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'preparing' | 'ready'

  const filteredOrders = orders.filter(
    (order) => filter === 'all' || order.status === filter
  );

  const handleItemStatus = (orderId, itemId, newStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        );

        // Calculate overall order status
        const allReady = updatedItems.every((i) => i.status === 'ready' || i.status === 'served');
        const anyPreparing = updatedItems.some((i) => i.status === 'preparing');

        let orderStatus = order.status;
        if (allReady) orderStatus = 'ready';
        else if (anyPreparing) orderStatus = 'preparing';

        // Emit socket event
        updateOrderItemStatus({
          orderId,
          itemId,
          status: newStatus,
          tableId: order.tableNumber,
        });

        return { ...order, items: updatedItems, status: orderStatus };
      })
    );
  };

  const markAllReady = (orderId) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          status: 'ready',
          items: order.items.map((item) => ({ ...item, status: 'ready' })),
        };
      })
    );
  };

  const OrderCard = ({ order }) => {
    const config = STATUS_CONFIG[order.status];
    const timeAgo = formatDistanceToNow(order.createdAt, { addSuffix: true });
    const isUrgent = Date.now() - order.createdAt.getTime() > 10 * 60 * 1000; // 10 min

    return (
      <div
        className={clsx(
          'card',
          isUrgent && order.status !== 'ready' && 'ring-2 ring-red-500'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-surface-100">
                Table {order.tableNumber}
              </span>
              <span className={clsx('badge', config.class)}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-surface-500 mt-1">
              #{order.orderNumber}
            </p>
          </div>
          <div className={clsx(
            'flex items-center gap-1 text-sm',
            isUrgent && order.status !== 'ready' ? 'text-red-400' : 'text-surface-400'
          )}>
            <Clock className="w-4 h-4" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {order.items.map((item) => {
            const itemConfig = STATUS_CONFIG[item.status];
            return (
              <div
                key={item.id}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-xl',
                  'bg-surface-800/50'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-100">
                      {item.quantity}x {item.name}
                    </span>
                    {item.notes && (
                      <span className="text-xs text-amber-400">
                        ({item.notes})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('badge text-xs', itemConfig.class)}>
                    {itemConfig.label}
                  </span>
                  {itemConfig.next && (
                    <button
                      onClick={() => handleItemStatus(order.id, item.id, itemConfig.next)}
                      className="btn-sm btn-primary"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {order.status !== 'ready' && (
            <button
              onClick={() => markAllReady(order.id)}
              className="btn-success flex-1"
            >
              <Check className="w-4 h-4" />
              All Ready
            </button>
          )}
          {order.status === 'ready' && (
            <button className="btn-primary flex-1">
              <Bell className="w-4 h-4" />
              Call Server
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-surface-100">Kitchen Display</h1>
            <p className="text-surface-400">{filteredOrders.length} active orders</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {['all', 'pending', 'preparing', 'ready'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={clsx(
              'btn whitespace-nowrap capitalize',
              filter === status ? 'btn-primary' : 'btn-secondary'
            )}
          >
            {status}
            {status !== 'all' && (
              <span className="ml-1">
                ({orders.filter((o) => o.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-surface-700 mx-auto mb-4" />
          <p className="text-surface-400">No orders to display</p>
        </div>
      )}
    </div>
  );
}
