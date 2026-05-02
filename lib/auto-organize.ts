import type { Item, Folder } from './types';
import { CATEGORIES } from './data';

export interface FolderSummary {
  folderId: string;
  folderName: string;
  color: string;
  isNew: boolean;
  items: { id: string; title: string }[];
}

export interface AutoOrganizeResult {
  newFolders: Folder[];
  moves: { itemId: string; folderId: string }[];
  folderSummaries: FolderSummary[];
}

export function computeAutoOrganize(
  items: Item[],
  existingFolders: Folder[],
  entityId: string,
): AutoOrganizeResult {
  const existingFolderNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
  const newFolders: Folder[] = [];
  const moves: { itemId: string; folderId: string }[] = [];
  const summaryMap = new Map<string, FolderSummary>();

  // Group items by category
  const catItems: Record<string, Item[]> = {};
  items.forEach(it => {
    (catItems[it.category] = catItems[it.category] || []).push(it);
  });

  const now = Date.now();
  let autoIdx = 0;

  for (const [catId, catItemList] of Object.entries(catItems)) {
    if (catItemList.length === 0) continue;
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) continue;

    // Check if a folder already exists for this category
    let folder = existingFolders.find(f => f.name.toLowerCase() === cat.name.toLowerCase());
    let isNew = false;

    if (!folder && !existingFolderNames.has(cat.name.toLowerCase())) {
      // Create new folder
      const newFolder: Folder = {
        id: `f-auto-${catId}-${now}-${autoIdx++}`,
        entityId,
        name: cat.name,
        color: cat.color,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      newFolders.push(newFolder);
      existingFolderNames.add(cat.name.toLowerCase());
      folder = newFolder;
      isNew = true;
    }

    if (folder) {
      const itemsForFolder: { id: string; title: string }[] = [];

      catItemList.forEach(it => {
        // Only move items that aren't already in this folder
        if (it.folderId !== folder!.id) {
          moves.push({ itemId: it.id, folderId: folder!.id });
          itemsForFolder.push({ id: it.id, title: it.title });
        } else {
          // Already in folder — still include in summary for display
          itemsForFolder.push({ id: it.id, title: it.title });
        }
      });

      summaryMap.set(folder.id, {
        folderId: folder.id,
        folderName: folder.name,
        color: folder.color || cat.color,
        isNew,
        items: itemsForFolder,
      });
    }
  }

  return {
    newFolders,
    moves,
    folderSummaries: Array.from(summaryMap.values()),
  };
}
