import { useEffect, useState } from 'react';
import { useTablesStore } from '../stores/tablesStore';
import { useAuthStore } from '../stores/authStore';
import {
  Plus,
  QrCode,
  Edit2,
  Trash2,
  Users,
  Check,
  X,
  Loader2,
  Download,
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_CONFIG = {
  available: { label: 'Available', class: 'table-available', color: 'green' },
  occupied: { label: 'Occupied', class: 'table-occupied', color: 'primary' },
  reserved: { label: 'Reserved', class: 'table-reserved', color: 'blue' },
  cleaning: { label: 'Cleaning', class: 'table-cleaning', color: 'amber' },
};

export default function TablesPage() {
  const {
    tables,
    layout,
    fetchTables,
    fetchLayout,
    updateTableStatus,
    isLoading,
  } = useTablesStore();
  const { isManager } = useAuthStore();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'layout'

  useEffect(() => {
    fetchLayout();
  }, []);

  const handleStatusChange = async (tableId, newStatus) => {
    try {
      await updateTableStatus(tableId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const TableCard = ({ table }) => {
    const config = STATUS_CONFIG[table.status];

    return (
      <div
        className={clsx(
          'card cursor-pointer transition-all',
          'hover:scale-[1.02] active:scale-[0.98]',
          'border-2',
          config.class
        )}
        onClick={() => setSelectedTable(table)}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold">#{table.tableNumber}</h3>
            {table.name && (
              <p className="text-sm opacity-75">{table.name}</p>
            )}
          </div>
          <div className={clsx('badge', `badge-${config.color === 'primary' ? 'primary' : config.color === 'green' ? 'success' : config.color === 'blue' ? 'primary' : 'warning'}`)}>
            {config.label}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm opacity-75">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{table.capacity}</span>
          </div>
          {table.roomName && (
            <span>{table.roomName}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-100">Tables</h1>
          <p className="text-surface-400">Manage your restaurant layout</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-400 hover:text-surface-100'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('layout')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                viewMode === 'layout'
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-400 hover:text-surface-100'
              )}
            >
              Layout
            </button>
          </div>
          {isManager() && (
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Table
            </button>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = tables.filter((t) => t.status === status).length;
          return (
            <div
              key={status}
              className="flex items-center gap-2 px-3 py-2 bg-surface-800 rounded-lg"
            >
              <div
                className={clsx(
                  'w-3 h-3 rounded-full',
                  config.color === 'green' && 'bg-green-500',
                  config.color === 'primary' && 'bg-primary-500',
                  config.color === 'blue' && 'bg-blue-500',
                  config.color === 'amber' && 'bg-amber-500'
                )}
              />
              <span className="text-surface-300 text-sm">{config.label}</span>
              <span className="font-medium text-surface-100">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Tables grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      ) : (
        /* Layout view - by floors and rooms */
        <div className="space-y-8">
          {layout.map((floor) => (
            <div key={floor.id}>
              <h2 className="text-lg font-semibold text-surface-100 mb-4">
                {floor.name}
              </h2>
              <div className="space-y-4">
                {floor.rooms?.map((room) => (
                  <div key={room.id} className="card">
                    <h3 className="font-medium text-surface-300 mb-3">{room.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {room.tables?.map((table) => (
                        <TableCard key={table.id} table={table} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table detail modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-100">
                Table #{selectedTable.tableNumber}
              </h2>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 text-surface-400 hover:text-surface-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current status */}
              <div>
                <label className="label">Current Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedTable.id, status)}
                      className={clsx(
                        'btn',
                        selectedTable.status === status
                          ? 'btn-primary'
                          : 'btn-secondary'
                      )}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table info */}
              <div className="flex items-center justify-between py-3 border-t border-surface-700">
                <span className="text-surface-400">Capacity</span>
                <span className="text-surface-100 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {selectedTable.capacity} seats
                </span>
              </div>

              {selectedTable.roomName && (
                <div className="flex items-center justify-between py-3 border-t border-surface-700">
                  <span className="text-surface-400">Location</span>
                  <span className="text-surface-100">
                    {selectedTable.floorName} - {selectedTable.roomName}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowQR(true)}
                  className="btn-secondary flex-1"
                >
                  <QrCode className="w-4 h-4" />
                  Show QR
                </button>
                {isManager() && (
                  <>
                    <button className="btn-secondary">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="btn-danger">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
