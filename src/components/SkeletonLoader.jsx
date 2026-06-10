/**
 * SkeletonLoader — Fixes: Issue #26 (No loading states)
 *
 * Shows animated skeleton while data is loading.
 * Much better UX than blank space or spinner.
 *
 * Usage:
 *   {isLoading ? <SkeletonLoader lines={3} /> : <InvoiceList {...} />}
 */

import React from 'react';

/**
 * Simple skeleton line (animated shimmer)
 */
function SkeletonLine({ height = 16, width = '100%', style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

/**
 * Skeleton card (like a list item)
 */
export function SkeletonCard({ count = 1, style = {} }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
      {Array(count)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              background: '#fff',
              border: '1px solid var(--border-color)',
              borderRadius: 14,
              marginBottom: 12,
              ...style,
            }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--bg-secondary)',
                  animation: 'shimmer 1.5s infinite',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <SkeletonLine height={16} width="60%" style={{ marginBottom: 8 }} />
                <SkeletonLine height={12} width="40%" />
              </div>
              <SkeletonLine height={16} width={60} />
            </div>
          </div>
        ))}
    </>
  );
}

/**
 * Skeleton table row
 */
export function SkeletonTableRow({ columns = 6, count = 5 }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
      {Array(count)
        .fill(null)
        .map((_, rowIdx) => (
          <tr key={rowIdx}>
            {Array(columns)
              .fill(null)
              .map((_, colIdx) => (
                <td key={colIdx} style={{ padding: 14 }}>
                  <SkeletonLine width={colIdx % 3 === 0 ? '80%' : colIdx % 3 === 1 ? '60%' : '40%'} />
                </td>
              ))}
          </tr>
        ))}
    </>
  );
}

/**
 * Skeleton for KPI cards (dashboard)
 */
export function SkeletonKPICards({ count = 4 }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 14 }}>
        {Array(count)
          .fill(null)
          .map((_, i) => (
            <div
              key={i}
              style={{
                padding: 24,
                background: '#fff',
                border: '1px solid var(--border-color)',
                borderRadius: 16,
              }}
            >
              <SkeletonLine height={12} width="50%" style={{ marginBottom: 12 }} />
              <SkeletonLine height={28} width="70%" style={{ marginBottom: 12 }} />
              <SkeletonLine height={10} width="40%" />
            </div>
          ))}
      </div>
    </>
  );
}

/**
 * Generic skeleton loader (lines)
 */
export default function SkeletonLoader({ lines = 5, style = {} }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
      <div style={style}>
        {Array(lines)
          .fill(null)
          .map((_, i) => (
            <SkeletonLine
              key={i}
              width={i === lines - 1 ? '60%' : '100%'}
              style={{ marginBottom: i === lines - 1 ? 0 : 12 }}
            />
          ))}
      </div>
    </>
  );
}

/**
 * USAGE EXAMPLES
 *
 * // Generic lines
 * {isLoading ? <SkeletonLoader lines={3} /> : <Content />}
 *
 * // Card list
 * {isLoading ? <SkeletonCard count={5} /> : <InvoiceList />}
 *
 * // Table
 * <tbody>
 *   {isLoading ? <SkeletonTableRow columns={6} count={5} /> : (
 *     invoices.map(inv => <tr>...</tr>)
 *   )}
 * </tbody>
 *
 * // KPI Dashboard
 * {isLoading ? <SkeletonKPICards count={4} /> : <KPICards {...} />}
 */
