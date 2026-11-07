import type { ItemRow } from '@/db/schema';
import { clearPurchased, deleteItem, recheckItems, restoreItem, restoreItems, setPurchased, uncheckAll } from '@/db/repo';
import { showToast } from '@/features/shell/toasts';

/** Screen 32: tick with an Undo toast. */
export async function togglePurchased(item: ItemRow, purchased: boolean) {
  await setPurchased(item.id, purchased);
  if (purchased) {
    showToast({
      icon: 'check',
      message: `${item.name} marked as purchased`,
      actionLabel: 'Undo',
      onAction: () => void setPurchased(item.id, false),
    });
  }
}

/** Screen 31: delete straight away, with Undo (soft delete, sync rule 3). */
export async function deleteWithUndo(item: Pick<ItemRow, 'id' | 'name'>) {
  await deleteItem(item.id);
  showToast({
    icon: 'trash',
    message: `“${item.name}” deleted`,
    actionLabel: 'Undo',
    onAction: () => void restoreItem(item.id),
  });
}

export async function uncheckAllWithUndo(listId: string) {
  const changed = await uncheckAll(listId);
  if (!changed.length) return showToast({ icon: 'check', message: 'Nothing is ticked yet' });
  showToast({
    icon: 'refresh',
    message: `${changed.length} ${changed.length === 1 ? 'item' : 'items'} unchecked`,
    actionLabel: 'Undo',
    onAction: () => void recheckItems(changed),
  });
}

export async function clearPurchasedWithUndo(listId: string) {
  const ids = await clearPurchased(listId);
  if (!ids.length) return showToast({ icon: 'check', message: 'No purchased items to clear' });
  showToast({
    icon: 'trash',
    message: `${ids.length} purchased ${ids.length === 1 ? 'item' : 'items'} cleared`,
    actionLabel: 'Undo',
    onAction: () => void restoreItems(ids),
  });
}
