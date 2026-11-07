import { Toast } from '@/components/Toast';
import { usePwaUpdate } from '@/pwa/usePwaUpdate';

/** W4: "Update available" toast with Reload (Figma screen W3, to design). */
export function UpdateToast() {
  const { needRefresh, reload } = usePwaUpdate();
  if (!needRefresh) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(100px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 desktop:bottom-6">
      <Toast className="pointer-events-auto" icon="refresh" message="A new version of Shoppa is ready" actionLabel="Reload" onAction={reload} />
    </div>
  );
}
