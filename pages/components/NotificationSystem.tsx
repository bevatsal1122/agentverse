import React, { useState, useEffect } from 'react';
import { Notification } from '../hooks/useNotifications';

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const getNotificationStyles = () => {
    const baseStyles = "transform transition-all duration-300 ease-in-out shadow-lg border-l-4 p-4 rounded-lg";
    
    if (isLeaving) {
      return `${baseStyles} translate-x-full opacity-0`;
    }
    
    if (isVisible) {
      return `${baseStyles} translate-x-0 opacity-100`;
    }
    
    return `${baseStyles} translate-x-full opacity-0`;
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-900 border-green-500 text-green-100';
      case 'warning':
        return 'bg-yellow-900 border-yellow-500 text-yellow-100';
      case 'error':
        return 'bg-red-900 border-red-500 text-red-100';
      default:
        return 'bg-blue-900 border-blue-500 text-blue-100';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`${getNotificationStyles()} ${getTypeStyles()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 text-lg">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold mb-1">
            {notification.title}
          </h4>
          <p className="text-sm opacity-90">
            {notification.message}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 ml-3 text-lg opacity-70 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationSystem;
