import { useState, useCallback } from 'react';
import { query, collection, limit, startAfter, onSnapshot, getDocs } from 'firebase/firestore';

/**
 * PAGINATION HOOK - Fixes: Issues #2, #3 (No pagination, hard limits)
 *
 * Usage:
 *   const { items, hasMore, loadMore, isLoading } = usePagination(db, 'invoices', 50);
 *
 * Returns:
 *   - items: Current page items
 *   - hasMore: Boolean (true if more items exist)
 *   - loadMore: Function to fetch next page
 *   - isLoading: Boolean
 */
export const usePagination = (db, collectionName, pageSize = 50, whereClause = null) => {
  const [items, setItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const q = lastDoc
        ? query(
            collection(db, collectionName),
            ...(whereClause ? [whereClause] : []),
            startAfter(lastDoc),
            limit(pageSize)
          )
        : query(
            collection(db, collectionName),
            ...(whereClause ? [whereClause] : []),
            limit(pageSize)
          );

      const snap = await getDocs(q);
      const newItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setItems(prev => [...prev, ...newItems]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === pageSize);
    } catch (err) {
      console.error('Pagination error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName, pageSize, lastDoc, hasMore, isLoading, whereClause]);

  // Auto-load first page
  useState(() => {
    loadMore();
  }, [loadMore]);

  return { items, hasMore, loadMore, isLoading };
};
