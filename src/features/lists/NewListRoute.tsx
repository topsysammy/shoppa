import { useEffect } from 'react';
import { ListsPage } from './ListsPage';
import { openSheet } from './sheetStore';

/** /lists/new (PRD section 5): the Lists tab with Create list open. */
export function NewListRoute() {
  useEffect(() => openSheet({ kind: 'createList' }), []);
  return <ListsPage />;
}
