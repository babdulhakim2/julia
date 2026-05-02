'use client';

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Entity, Item, Folder } from './types';
import { ENTITIES_SEED, ITEMS_SEED, CATEGORIES, FOLDERS_SEED } from './data';
import { loadStore, saveStore } from './storage';

export interface StoreData {
  entities: Entity[];
  items: Item[];
  folders: Folder[];
  onboarded: boolean;
}

export interface StoreState extends StoreData {
  hydrated: boolean;
}

type Action =
  | { type: 'ADD_ENTITY'; entity: Entity }
  | { type: 'REMOVE_ENTITY'; id: string }
  | { type: 'UPDATE_ENTITY'; id: string; patch: Partial<Entity> }
  | { type: 'SET_ENTITIES'; entities: Entity[] }
  | { type: 'ADD_ITEM'; item: Item }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'SET_ONBOARDED'; value: boolean }
  | { type: 'ADD_FOLDER'; folder: Folder }
  | { type: 'REMOVE_FOLDER'; id: string }
  | { type: 'RENAME_FOLDER'; id: string; name: string }
  | { type: 'MOVE_ITEM_TO_FOLDER'; itemId: string; folderId: string | null }
  | { type: 'AUTO_ORGANIZE'; entityId: string }
  | { type: 'HYDRATE'; state: StoreData }
  | { type: 'MARK_HYDRATED' };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'ADD_ENTITY':
      return { ...state, entities: [...state.entities, action.entity] };
    case 'REMOVE_ENTITY':
      return { ...state, entities: state.entities.filter(e => e.id !== action.id) };
    case 'UPDATE_ENTITY':
      return { ...state, entities: state.entities.map(e => e.id === action.id ? { ...e, ...action.patch } : e) };
    case 'SET_ENTITIES':
      return { ...state, entities: action.entities };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };
    case 'UPDATE_ITEM':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, ...action.patch } : i) };
    case 'SET_ONBOARDED':
      return { ...state, onboarded: action.value };
    case 'ADD_FOLDER':
      return { ...state, folders: [...state.folders, action.folder] };
    case 'REMOVE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter(f => f.id !== action.id),
        items: state.items.map(i => i.folderId === action.id ? { ...i, folderId: undefined } : i),
      };
    case 'RENAME_FOLDER':
      return { ...state, folders: state.folders.map(f => f.id === action.id ? { ...f, name: action.name } : f) };
    case 'MOVE_ITEM_TO_FOLDER':
      return { ...state, items: state.items.map(i => i.id === action.itemId ? { ...i, folderId: action.folderId ?? undefined } : i) };
    case 'AUTO_ORGANIZE': {
      const entityItems = state.items.filter(i => i.entity === action.entityId);
      const existingFolders = state.folders.filter(f => f.entityId === action.entityId);
      const existingFolderNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
      const newFolders: Folder[] = [];
      const itemUpdates: Record<string, string> = {};

      const catItems: Record<string, Item[]> = {};
      entityItems.forEach(it => {
        (catItems[it.category] = catItems[it.category] || []).push(it);
      });

      for (const [catId, items] of Object.entries(catItems)) {
        if (items.length === 0) continue;
        const cat = CATEGORIES.find(c => c.id === catId);
        if (!cat) continue;

        let folder = existingFolders.find(f => f.name.toLowerCase() === cat.name.toLowerCase());
        if (!folder && !existingFolderNames.has(cat.name.toLowerCase())) {
          folder = {
            id: `f-auto-${catId}-${Date.now()}`,
            entityId: action.entityId,
            name: cat.name,
            color: cat.color,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          newFolders.push(folder);
          existingFolderNames.add(cat.name.toLowerCase());
        }
        if (folder) {
          items.forEach(it => { itemUpdates[it.id] = folder!.id; });
        }
      }

      return {
        ...state,
        folders: [...state.folders, ...newFolders],
        items: state.items.map(i => itemUpdates[i.id] ? { ...i, folderId: itemUpdates[i.id] } : i),
      };
    }
    case 'HYDRATE':
      return { ...action.state, hydrated: true };
    case 'MARK_HYDRATED':
      return { ...state, hydrated: true };
    default:
      return state;
  }
}

const initialState: StoreState = {
  entities: ENTITIES_SEED.map(e => ({ ...e })),
  items: ITEMS_SEED.map(i => ({ ...i })),
  folders: FOLDERS_SEED.map(f => ({ ...f })),
  onboarded: false,
  hydrated: false,
};

const StoreContext = createContext<{
  state: StoreState;
  dispatch: React.Dispatch<Action>;
  hydrated: boolean;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadStore();
    if (saved && saved.entities && saved.items) {
      dispatch({
        type: 'HYDRATE',
        state: {
          entities: saved.entities,
          items: saved.items,
          folders: saved.folders ?? FOLDERS_SEED.map(f => ({ ...f })),
          onboarded: saved.onboarded ?? false,
        },
      });
      return;
    }
    dispatch({ type: 'MARK_HYDRATED' });
  }, []);

  // Persist to localStorage on state changes (skip before hydration)
  useEffect(() => {
    if (!state.hydrated) return;
    const { entities, items, folders, onboarded } = state;
    saveStore({ entities, items, folders, onboarded });
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch, hydrated: state.hydrated }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
