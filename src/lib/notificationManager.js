/**
 * NOTIFICATION MANAGER - Fixes: Issue #16 (Notifications disappear)
 *
 * Provides persistent notifications with "Keep" button.
 * Prevents important notifications from disappearing before user reads them.
 *
 * Usage:
 *   const notify = useNotificationManager();
 *   notify('success', 'Invoice created', { persistent: true, duration: 'infinite' });
 */

/**
 * Standard notification durations (milliseconds)
 */
export const NOTIFICATION_DURATIONS = {
  SHORT: 3000,      // 3 seconds (for ephemeral messages)
  NORMAL: 5000,     // 5 seconds (standard)
  LONG: 8000,       // 8 seconds (important)
  INFINITE: null,   // Never auto-dismiss (user must close)
};

/**
 * Notification types with default durations
 */
export const NOTIFICATION_DEFAULTS = {
  success: {
    icon: '✓',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    duration: NOTIFICATION_DURATIONS.NORMAL,
  },
  error: {
    icon: '✕',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    duration: NOTIFICATION_DURATIONS.LONG, // Longer for errors
  },
  warning: {
    icon: '⚠',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    duration: NOTIFICATION_DURATIONS.LONG,
  },
  info: {
    icon: 'ℹ',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    duration: NOTIFICATION_DURATIONS.NORMAL,
  },
  pending: {
    icon: '⟳',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    duration: NOTIFICATION_DURATIONS.INFINITE, // Don't auto-dismiss loading states
  },
};

/**
 * Create notification component with persistent option
 *
 * @param {string} type - 'success' | 'error' | 'warning' | 'info' | 'pending'
 * @param {string} message - Notification text
 * @param {Object} options - { persistent: boolean, duration: number, action: { label, onClick } }
 * @returns {Object} Notification object
 */
export const createNotification = (type, message, options = {}) => {
  const defaults = NOTIFICATION_DEFAULTS[type] || NOTIFICATION_DEFAULTS.info;
  const duration = options.duration !== undefined ? options.duration : defaults.duration;

  return {
    id: `notif-${Date.now()}-${Math.random()}`,
    type,
    message,
    persistent: options.persistent || duration === NOTIFICATION_DURATIONS.INFINITE,
    duration,
    action: options.action, // { label: 'Undo', onClick: fn }
    keepButton: options.keepButton !== false, // Show "Keep" button by default
    timestamp: Date.now(),
    ...defaults,
  };
};

/**
 * REACT HOOK: useNotificationManager
 *
 * Usage in component:
 *   const notify = useNotificationManager();
 *   notify('success', 'Saved!');
 *   notify('error', 'Failed to save', { persistent: true }); // Won't disappear
 */
export const useNotificationManager = () => {
  const [notifications, setNotifications] = React.useState([]);

  const notify = React.useCallback((type, message, options = {}) => {
    const notif = createNotification(type, message, options);
    setNotifications((prev) => [...prev, notif]);

    // Auto-dismiss after duration (unless persistent)
    if (notif.duration) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, notif.duration);
    }

    return notif.id;
  }, []);

  const dismiss = React.useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const keepNotification = React.useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, persistent: true, duration: NOTIFICATION_DURATIONS.INFINITE }
          : n
      )
    );
  }, []);

  return { notify, dismiss, keepNotification, notifications };
};

/**
 * NOTIFICATION TOAST UI COMPONENT
 *
 * Example implementation:
 *   <div style={{
 *     position: 'fixed',
 *     bottom: 24,
 *     right: 24,
 *     display: 'flex',
 *     flexDirection: 'column',
 *     gap: 12,
 *     zIndex: 10000,
 *   }}>
 *     {notifications.map(notif => (
 *       <div
 *         key={notif.id}
 *         style={{
 *           padding: '14px 18px',
 *           background: notif.bg,
 *           border: `1.5px solid ${notif.border}`,
 *           borderRadius: 12,
 *           color: notif.color,
 *           fontSize: 13,
 *           fontWeight: 700,
 *           display: 'flex',
 *           alignItems: 'center',
 *           gap: 10,
 *           maxWidth: 400,
 *           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
 *         }}
 *       >
 *         <span>{notif.icon}</span>
 *         <span style={{ flex: 1 }}>{notif.message}</span>
 *
 *         {notif.persistent && notif.keepButton ? (
 *           <button
 *             onClick={() => dismiss(notif.id)}
 *             style={{
 *               background: 'none',
 *               border: 'none',
 *               color: notif.color,
 *               cursor: 'pointer',
 *               fontSize: 16,
 *               padding: 0,
 *             }}
 *           >
 *             ✕
 *           </button>
 *         ) : notif.keepButton ? (
 *           <button
 *             onClick={() => keepNotification(notif.id)}
 *             style={{
 *               background: 'none',
 *               border: 'none',
 *               color: notif.color,
 *               cursor: 'pointer',
 *               fontSize: 11,
 *               fontWeight: 800,
 *               padding: '4px 8px',
 *               whiteSpace: 'nowrap',
 *             }}
 *           >
 *             Keep
 *           </button>
 *         ) : null}
 *       </div>
 *     ))}
 *   </div>
 */

import React from 'react';

// Re-export for convenience
export default {
  DURATIONS: NOTIFICATION_DURATIONS,
  DEFAULTS: NOTIFICATION_DEFAULTS,
  createNotification,
  useNotificationManager,
};
