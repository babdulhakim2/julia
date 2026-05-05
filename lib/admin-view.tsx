'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const WORKSPACE_KEY = 'julia-admin-view-workspace';
const WORKSPACE_NAME_KEY = 'julia-admin-view-workspace-name';
const CHANGE_EVENT = 'julia-admin-view-change';

interface AdminWorkspaceView {
  workspaceId: string;
  workspaceName: string;
}

function readView(): AdminWorkspaceView {
  if (typeof window === 'undefined') return { workspaceId: '', workspaceName: '' };
  try {
    return {
      workspaceId: localStorage.getItem(WORKSPACE_KEY) || '',
      workspaceName: localStorage.getItem(WORKSPACE_NAME_KEY) || '',
    };
  } catch {
    return { workspaceId: '', workspaceName: '' };
  }
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useAdminWorkspaceView() {
  const [view, setViewState] = useState<AdminWorkspaceView>(readView);

  useEffect(() => {
    function sync() {
      setViewState(readView());
    }
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setView = useCallback((workspaceId: string, workspaceName: string) => {
    localStorage.setItem(WORKSPACE_KEY, workspaceId);
    localStorage.setItem(WORKSPACE_NAME_KEY, workspaceName);
    localStorage.removeItem('julia-selected-item');
    setViewState({ workspaceId, workspaceName });
    emitChange();
  }, []);

  const clearView = useCallback(() => {
    localStorage.removeItem(WORKSPACE_KEY);
    localStorage.removeItem(WORKSPACE_NAME_KEY);
    localStorage.removeItem('julia-selected-item');
    setViewState({ workspaceId: '', workspaceName: '' });
    emitChange();
  }, []);

  return {
    ...view,
    isViewingClient: Boolean(view.workspaceId),
    setView,
    clearView,
  };
}

export function useActiveWorkspace() {
  const adminView = useAdminWorkspaceView();
  const workspace = useQuery(
    api.workspaces.getMyWorkspace,
    adminView.workspaceId
      ? { viewWorkspaceId: adminView.workspaceId as Id<'workspaces'> }
      : {},
  );

  return {
    workspace,
    ...adminView,
  };
}
