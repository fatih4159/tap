import { create } from 'zustand';
import { menuApi } from '../services/api';

/**
 * Menu Store
 * Manages menu categories and items
 */
export const useMenuStore = create((set, get) => ({
  categories: [],
  items: [],
  menu: [], // Categories with items nested
  selectedCategory: null,
  isLoading: false,
  error: null,

  // Fetch full menu (categories with items)
  fetchMenu: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await menuApi.getFull();
      set({ menu: response.menu, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch categories only
  fetchCategories: async () => {
    try {
      const response = await menuApi.getCategories();
      set({ categories: response.categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  // Fetch items
  fetchItems: async (params) => {
    set({ isLoading: true });
    try {
      const response = await menuApi.getItems(params);
      set({ items: response.items, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Create category
  createCategory: async (data) => {
    try {
      const response = await menuApi.createCategory(data);
      set((state) => ({
        categories: [...state.categories, response.category],
        menu: [...state.menu, { ...response.category, items: [] }],
      }));
      return response.category;
    } catch (error) {
      throw error;
    }
  },

  // Update category
  updateCategory: async (id, data) => {
    try {
      const response = await menuApi.updateCategory(id, data);
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? response.category : c
        ),
        menu: state.menu.map((c) =>
          c.id === id ? { ...response.category, items: c.items } : c
        ),
      }));
      return response.category;
    } catch (error) {
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (id) => {
    try {
      await menuApi.deleteCategory(id);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        menu: state.menu.filter((c) => c.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },

  // Create item
  createItem: async (data) => {
    try {
      const response = await menuApi.createItem(data);
      const item = response.item;
      set((state) => ({
        items: [...state.items, item],
        menu: state.menu.map((c) =>
          c.id === item.categoryId
            ? { ...c, items: [...c.items, item] }
            : c
        ),
      }));
      return item;
    } catch (error) {
      throw error;
    }
  },

  // Update item
  updateItem: async (id, data) => {
    try {
      const response = await menuApi.updateItem(id, data);
      const item = response.item;
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? item : i)),
        menu: state.menu.map((c) => ({
          ...c,
          items: c.items.map((i) => (i.id === id ? item : i)),
        })),
      }));
      return item;
    } catch (error) {
      throw error;
    }
  },

  // Toggle availability
  toggleAvailability: async (id) => {
    const item = get().items.find((i) => i.id === id) ||
      get().menu.flatMap((c) => c.items).find((i) => i.id === id);
    
    if (!item) return;

    try {
      const response = await menuApi.setAvailability(id, !item.isAvailable);
      const updatedItem = response.item;

      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updatedItem : i)),
        menu: state.menu.map((c) => ({
          ...c,
          items: c.items.map((i) => (i.id === id ? updatedItem : i)),
        })),
      }));

      return updatedItem;
    } catch (error) {
      throw error;
    }
  },

  // Handle real-time menu item update
  handleMenuItemUpdate: (data) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === data.itemId ? { ...i, isAvailable: data.isAvailable } : i
      ),
      menu: state.menu.map((c) => ({
        ...c,
        items: c.items.map((i) =>
          i.id === data.itemId ? { ...i, isAvailable: data.isAvailable } : i
        ),
      })),
    }));
  },

  // Delete item
  deleteItem: async (id) => {
    try {
      await menuApi.deleteItem(id);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        menu: state.menu.map((c) => ({
          ...c,
          items: c.items.filter((i) => i.id !== id),
        })),
      }));
    } catch (error) {
      throw error;
    }
  },

  // Select category
  selectCategory: (category) => set({ selectedCategory: category }),
  clearSelection: () => set({ selectedCategory: null }),

  // Get items by category
  getItemsByCategory: (categoryId) => {
    const category = get().menu.find((c) => c.id === categoryId);
    return category?.items || [];
  },

  // Get available items only
  getAvailableItems: () => {
    return get().menu.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.isAvailable),
    }));
  },

  clearError: () => set({ error: null }),
}));

export default useMenuStore;
