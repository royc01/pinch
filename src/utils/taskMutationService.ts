import { applyTaskAttributeChanges } from '@/crdtStore';
import { publishTaskAttributeChange } from './taskChangeCoordinator';

export function applyTaskAttributeMutation(
  blockId: string,
  attrs: Record<string, string>
): void {
  applyTaskAttributeChanges(blockId, attrs);
  publishTaskAttributeChange(blockId, attrs);
}
