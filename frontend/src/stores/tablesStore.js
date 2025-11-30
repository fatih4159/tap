import { create } from 'zustand';
import { tablesApi } from '../services/api';

/**
 * Tables Store
 * Manages table and layout state
 */
export const useTablesStore = create((set, get) => ({
  tables: [],
  floors: [],
  rooms: [],
  layout: [],
  selectedTable: null,
  isLoading: false,
  error: null,

  // Fetch all tables
  fetchTables: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tablesApi.list();
      set({ tables: response.tables, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch full layout (floors/rooms/tables hierarchy)
  fetchLayout: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tablesApi.getLayout();
      set({ layout: response.layout, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch floors
  fetchFloors: async () => {
    try {
      const response = await tablesApi.getFloors();
      set({ floors: response.floors });
    } catch (error) {
      console.error('Failed to fetch floors:', error);
    }
  },

  // Fetch rooms
  fetchRooms: async (floorId) => {
    try {
      const response = await tablesApi.getRooms(floorId);
      set({ rooms: response.rooms });
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  },

  // Update table status
  updateTableStatus: async (tableId, status) => {
    try {
      const response = await tablesApi.updateStatus(tableId, status);
      set((state) => ({
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, status } : t
        ),
        layout: state.layout.map((floor) => ({
          ...floor,
          rooms: floor.rooms.map((room) => ({
            ...room,
            tables: room.tables.map((t) =>
              t.id === tableId ? { ...t, status } : t
            ),
          })),
        })),
      }));
      return response.table;
    } catch (error) {
      console.error('Failed to update table status:', error);
      throw error;
    }
  },

  // Handle real-time table status update
  handleTableStatusUpdate: (data) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === data.tableId ? { ...t, status: data.status } : t
      ),
      layout: state.layout.map((floor) => ({
        ...floor,
        rooms: floor.rooms.map((room) => ({
          ...room,
          tables: room.tables.map((t) =>
            t.id === data.tableId ? { ...t, status: data.status } : t
          ),
        })),
      })),
    }));
  },

  // Create table
  createTable: async (data) => {
    try {
      const response = await tablesApi.create(data);
      set((state) => ({
        tables: [...state.tables, response.table],
      }));
      return response.table;
    } catch (error) {
      throw error;
    }
  },

  // Update table
  updateTable: async (id, data) => {
    try {
      const response = await tablesApi.update(id, data);
      set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? response.table : t)),
      }));
      return response.table;
    } catch (error) {
      throw error;
    }
  },

  // Delete table
  deleteTable: async (id) => {
    try {
      await tablesApi.delete(id);
      set((state) => ({
        tables: state.tables.filter((t) => t.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },

  // Select table
  selectTable: (table) => set({ selectedTable: table }),
  clearSelection: () => set({ selectedTable: null }),

  // Get table by ID
  getTableById: (id) => get().tables.find((t) => t.id === id),

  // Get tables by status
  getTablesByStatus: (status) => get().tables.filter((t) => t.status === status),

  clearError: () => set({ error: null }),
}));

export default useTablesStore;
