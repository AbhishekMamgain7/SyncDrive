import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const useFileStore = create((set, get) => ({
  // State
  files: [],
  folders: [],
  currentPath: '/',
  selectedItems: [],
  searchQuery: '',
  viewMode: 'grid', // 'grid' or 'list'
  sortBy: 'name', // 'name', 'size', 'date'
  sortOrder: 'asc', // 'asc' or 'desc'
  isLoading: false,
  error: null,

  // Mock data initialization
  initializeData: () => {
    const mockFolders = [
      {
        id: uuidv4(),
        name: 'Documents',
        type: 'folder',
        path: '/Documents',
        size: 0,
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-15'),
        owner: 'John Doe',
        permissions: ['read', 'write'],
        children: []
      },
      {
        id: uuidv4(),
        name: 'Images',
        type: 'folder',
        path: '/Images',
        size: 0,
        createdAt: new Date('2024-01-02'),
        modifiedAt: new Date('2024-01-16'),
        owner: 'John Doe',
        permissions: ['read', 'write'],
        children: []
      },
      {
        id: uuidv4(),
        name: 'Projects',
        type: 'folder',
        path: '/Projects',
        size: 0,
        createdAt: new Date('2024-01-03'),
        modifiedAt: new Date('2024-01-17'),
        owner: 'John Doe',
        permissions: ['read', 'write'],
        children: []
      }
    ];

    const mockFiles = [
      {
        id: uuidv4(),
        name: 'README.md',
        type: 'file',
        path: '/README.md',
        size: 1024,
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-15'),
        owner: 'John Doe',
        permissions: ['read', 'write'],
        extension: 'md',
        mimeType: 'text/markdown'
      },
      {
        id: uuidv4(),
        name: 'project-plan.docx',
        type: 'file',
        path: '/Documents/project-plan.docx',
        size: 2048,
        createdAt: new Date('2024-01-10'),
        modifiedAt: new Date('2024-01-16'),
        owner: 'John Doe',
        permissions: ['read', 'write'],
        extension: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      {
        id: uuidv4(),
        name: 'screenshot.png',
        type: 'file',
        path: '/Images/screenshot.png',
        size: 5120,
        createdAt: new Date('2024-01-12'),
        modifiedAt: new Date('2024-01-17'),
        owner: 'John Doe',
        permissions: ['read', 'write'],
        extension: 'png',
        mimeType: 'image/png'
      }
    ];

    set({ folders: mockFolders, files: mockFiles });
  },

  // Actions
  setCurrentPath: (path) => set({ currentPath: path }),
  
  setSelectedItems: (items) => set({ selectedItems: items }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setSortBy: (sortBy) => set({ sortBy }),
  
  setSortOrder: (order) => set({ sortOrder: order }),

  // File operations
  createFolder: (name, parentPath = '/') => {
    const newFolder = {
      id: uuidv4(),
      name,
      type: 'folder',
      path: `${parentPath}/${name}`.replace(/\/+/g, '/'),
      size: 0,
      createdAt: new Date(),
      modifiedAt: new Date(),
      owner: 'John Doe',
      permissions: ['read', 'write'],
      children: []
    };

    set(state => ({
      folders: [...state.folders, newFolder]
    }));
    
    return newFolder;
  },

  uploadFile: (file, parentPath = '/') => {
    const newFile = {
      id: uuidv4(),
      name: file.name,
      type: 'file',
      path: `${parentPath}/${file.name}`.replace(/\/+/g, '/'),
      size: file.size,
      createdAt: new Date(),
      modifiedAt: new Date(),
      owner: 'John Doe',
      permissions: ['read', 'write'],
      extension: file.name.split('.').pop(),
      mimeType: file.type
    };

    set(state => ({
      files: [...state.files, newFile]
    }));
    
    return newFile;
  },

  deleteItems: (itemIds) => {
    set(state => ({
      files: state.files.filter(file => !itemIds.includes(file.id)),
      folders: state.folders.filter(folder => !itemIds.includes(folder.id)),
      selectedItems: []
    }));
  },

  moveItems: (itemIds, destinationPath) => {
    set(state => ({
      files: state.files.map(file => 
        itemIds.includes(file.id) 
          ? { ...file, path: `${destinationPath}/${file.name}`, modifiedAt: new Date() }
          : file
      ),
      folders: state.folders.map(folder => 
        itemIds.includes(folder.id) 
          ? { ...folder, path: `${destinationPath}/${folder.name}`, modifiedAt: new Date() }
          : folder
      )
    }));
  },

  renameItem: (itemId, newName) => {
    set(state => ({
      files: state.files.map(file => 
        file.id === itemId 
          ? { ...file, name: newName, path: file.path.replace(/\/[^\/]+$/, `/${newName}`), modifiedAt: new Date() }
          : file
      ),
      folders: state.folders.map(folder => 
        folder.id === itemId 
          ? { ...folder, name: newName, path: folder.path.replace(/\/[^\/]+$/, `/${newName}`), modifiedAt: new Date() }
          : folder
      )
    }));
  },

  // Computed values
  getCurrentItems: () => {
    const state = get();
    const path = state.currentPath;
    
    let currentFiles = state.files.filter(file => 
      file.path.startsWith(path) && 
      file.path.substring(path.length + 1).split('/').length === 1
    );
    
    let currentFolders = state.folders.filter(folder => 
      folder.path.startsWith(path) && 
      folder.path.substring(path.length + 1).split('/').length === 1
    );

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      currentFiles = currentFiles.filter(file => 
        file.name.toLowerCase().includes(query)
      );
      currentFolders = currentFolders.filter(folder => 
        folder.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const allItems = [...currentFiles, ...currentFolders];
    allItems.sort((a, b) => {
      let comparison = 0;
      
      if (state.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (state.sortBy === 'size') {
        comparison = a.size - b.size;
      } else if (state.sortBy === 'date') {
        comparison = new Date(a.modifiedAt) - new Date(b.modifiedAt);
      }
      
      return state.sortOrder === 'desc' ? -comparison : comparison;
    });

    return allItems;
  },

  getBreadcrumbs: () => {
    const state = get();
    const pathParts = state.currentPath.split('/').filter(part => part);
    const breadcrumbs = [{ name: 'Home', path: '/' }];
    
    let currentPath = '';
    pathParts.forEach(part => {
      currentPath += `/${part}`;
      breadcrumbs.push({ name: part, path: currentPath });
    });
    
    return breadcrumbs;
  }
}));

export default useFileStore;
