import { useEffect, useState } from 'react';
import { useMenuStore } from '../stores/menuStore';
import { useAuthStore } from '../stores/authStore';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  Ban,
  Image,
  Euro,
} from 'lucide-react';
import clsx from 'clsx';

export default function MenuPage() {
  const {
    menu,
    fetchMenu,
    toggleAvailability,
    createItem,
    updateItem,
    deleteItem,
    createCategory,
    isLoading,
  } = useMenuStore();
  const { isManager } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  // Filter items by search
  const filteredMenu = menu.map((category) => ({
    ...category,
    items: category.items?.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((category) =>
    !selectedCategory || category.id === selectedCategory
  );

  const handleToggleAvailability = async (itemId) => {
    try {
      await toggleAvailability(itemId);
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  const ItemCard = ({ item }) => (
    <div
      className={clsx(
        'card-interactive p-4 flex gap-4',
        !item.isAvailable && 'opacity-60'
      )}
    >
      {/* Image placeholder */}
      <div className="w-20 h-20 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <Image className="w-8 h-8 text-surface-600" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-surface-100 truncate">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-surface-400 truncate-2 mt-1">
                {item.description}
              </p>
            )}
          </div>
          <p className="font-bold text-primary-400 whitespace-nowrap">
            €{item.price.toFixed(2)}
          </p>
        </div>

        {/* Tags and actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {!item.isAvailable && (
              <span className="badge-danger">Sold Out</span>
            )}
            {item.dietaryInfo?.includes('vegetarian') && (
              <span className="badge-success">V</span>
            )}
            {item.dietaryInfo?.includes('vegan') && (
              <span className="badge-success">VG</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAvailability(item.id);
              }}
              className={clsx(
                'btn-sm btn-icon',
                item.isAvailable ? 'btn-ghost text-green-400' : 'btn-ghost text-red-400'
              )}
              title={item.isAvailable ? 'Mark as sold out' : 'Mark as available'}
            >
              {item.isAvailable ? (
                <Check className="w-4 h-4" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
            </button>
            {isManager() && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem(item);
                    setShowItemModal(true);
                  }}
                  className="btn-sm btn-icon btn-ghost"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-100">Menu</h1>
          <p className="text-surface-400">Manage your menu items and categories</p>
        </div>
        {isManager() && (
          <button
            onClick={() => {
              setEditingItem(null);
              setShowItemModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search menu items..."
            className="input pl-11"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
              'btn whitespace-nowrap',
              !selectedCategory ? 'btn-primary' : 'btn-secondary'
            )}
          >
            All
          </button>
          {menu.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={clsx(
                'btn whitespace-nowrap',
                selectedCategory === category.id ? 'btn-primary' : 'btn-secondary'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu categories and items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {filteredMenu.map((category) => (
            category.items?.length > 0 && (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-surface-100">
                    {category.name}
                  </h2>
                  <span className="text-sm text-surface-500">
                    {category.items.length} items
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {category.items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Item modal */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          categories={menu}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSave={async (data) => {
            if (editingItem) {
              await updateItem(editingItem.id, data);
            } else {
              await createItem(data);
            }
            setShowItemModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Item Modal Component
function ItemModal({ item, categories, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    categoryId: item?.categoryId || categories[0]?.id || '',
    isAvailable: item?.isAvailable ?? true,
    dietaryInfo: item?.dietaryInfo || [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        ...formData,
        price: parseFloat(formData.price),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-surface-100">
            {item ? 'Edit Item' : 'Add Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (€)</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-5 h-5 rounded bg-surface-800 border-surface-600"
              />
              <span className="text-surface-300">Available</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
