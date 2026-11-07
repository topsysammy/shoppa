import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { openSheet, useSheet } from '@/features/lists/sheetStore';

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * W7 keyboard shortcuts: N new item, L new list, / search, S start Shopping
 * Mode, ? shortcuts dialog. Esc is handled by every sheet, dialog and panel.
 * Ignored while typing or when a sheet is already open.
 */
export function useShortcuts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sheet = useSheet();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || sheet.kind !== 'none') return;
      const listId = pathname.match(/^\/lists\/([0-9a-f-]{36})/)?.[1];
      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          openSheet(listId ? { kind: 'addItem', listId } : { kind: 'quickAdd' });
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          openSheet({ kind: 'createList' });
          break;
        case '/':
          e.preventDefault();
          navigate('/search');
          break;
        case 's':
        case 'S':
          if (listId) {
            e.preventDefault();
            navigate(`/lists/${listId}/shop`);
          }
          break;
        case '?':
          e.preventDefault();
          openSheet({ kind: 'shortcuts' });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, pathname, sheet.kind]);
}
