'use client';

import { useRef, useCallback } from 'react';

interface UseTouchDragOptions {
  onLongPressStart: (x: number, y: number) => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchEnd: () => void;
  onTap?: () => void;
  longPressMs?: number;
  moveThreshold?: number;
}

type Phase = 'idle' | 'pending' | 'dragging';

export function useTouchDrag({
  onLongPressStart,
  onTouchMove: onMove,
  onTouchEnd: onEnd,
  onTap,
  longPressMs = 400,
  moveThreshold = 10,
}: UseTouchDragOptions) {
  const phaseRef = useRef<Phase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    phaseRef.current = 'pending';

    timerRef.current = setTimeout(() => {
      phaseRef.current = 'dragging';
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
      onLongPressStart(startPosRef.current.x, startPosRef.current.y);
    }, longPressMs);
  }, [onLongPressStart, longPressMs]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startPosRef.current.x;
    const dy = touch.clientY - startPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (phaseRef.current === 'pending') {
      if (dist > moveThreshold) {
        // Finger moved too far before long-press fired — cancel, allow scroll
        clearTimer();
        phaseRef.current = 'idle';
      }
    } else if (phaseRef.current === 'dragging') {
      e.preventDefault();
      onMove(touch.clientX, touch.clientY);
    }
  }, [onMove, moveThreshold, clearTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const phase = phaseRef.current;
    clearTimer();

    if (phase === 'dragging') {
      e.preventDefault();
      onEnd();
    } else if (phase === 'pending') {
      // Short tap — finger released before long-press timer
      phaseRef.current = 'idle';
      onTap?.();
    }

    phaseRef.current = 'idle';
  }, [clearTimer, onEnd, onTap]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
