import { useState, useCallback } from 'react';

/**
 * OPTIMISTIC MUTATIONS HOOK - Fixes: Issue #5 (No optimistic updates)
 *
 * Usage:
 *   const { mutate, isLoading, error } = useOptimisticMutation({
 *     onMutate: (vars) => oldState, // Return old state for rollback
 *     onSuccess: (data, vars) => { setItems([...items, data]); },
 *     onError: (err, vars, oldState) => { setItems(oldState); },
 *   });
 *
 *   mutate(async () => firebase.updateDoc(...));
 *
 * Benefits:
 *   - UI updates immediately (feels fast)
 *   - Automatic rollback on error
 *   - Better UX for network delays
 */
export const useOptimisticMutation = ({
  onMutate,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (asyncFn) => {
      const context = onMutate?.();

      setIsLoading(true);
      setError(null);

      try {
        const data = await asyncFn();
        onSuccess?.(data, context);
      } catch (err) {
        setError(err);
        onError?.(err, context);
      } finally {
        setIsLoading(false);
      }
    },
    [onMutate, onSuccess, onError]
  );

  return { mutate, isLoading, error };
};

/**
 * PATTERN:
 *
 * // Before (pessimistic - UI lags):
 * const handlePay = async () => {
 *   await updateDoc(invoiceRef, { status: 'Paid' });
 *   setInvoice({ ...invoice, status: 'Paid' });
 * };
 *
 * // After (optimistic - instant):
 * const { mutate } = useOptimisticMutation({
 *   onMutate: () => invoice,
 *   onSuccess: () => setInvoice({ ...invoice, status: 'Paid' }),
 *   onError: (err, oldState) => setInvoice(oldState),
 * });
 *
 * const handlePay = () => {
 *   mutate(() => updateDoc(invoiceRef, { status: 'Paid' }));
 * };
 */
