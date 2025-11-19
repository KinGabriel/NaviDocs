// @fileoverview NotificationDropdown component for displaying user notifications
// @module components/dropdowns/NotificationDropdown

import React from 'react';

const NotificationDropdown = ({ notifications = [], onClose, onSelect }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      right: '20px',
      width: '340px',
      background: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      borderRadius: '8px',
      zIndex: 1000,
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
        Notifications
        <button style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }} onClick={onClose}>✕</button>
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '16px', color: '#888' }}>No notifications</div>
      ) : (
        notifications.map((notif, idx) => (
          <div key={notif.id || idx} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => onSelect && onSelect(notif)}>
            <div style={{ fontWeight: notif.isRead ? 'normal' : 'bold' }}>{notif.message}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}</div>
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationDropdown;