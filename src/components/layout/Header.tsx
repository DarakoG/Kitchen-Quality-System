'use client';

import { useState, useEffect } from 'react';
import { User } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Menu, Settings, LogOut, User as UserIcon, Key, Loader2, Check } from 'lucide-react';
import { alertsApi, usersApi } from '@/lib/api';
import { toast } from 'sonner';
import { ViewType } from '@/components/layout/AppShell';
import { format } from 'date-fns';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
  onNavigate?: (view: ViewType) => void;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  COMPANY_ADMIN: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  BRANCH_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUPERVISOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  AUDITOR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface AlertNotification {
  id: string;
  alertType: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  branch?: { name: string } | null;
}

export function Header({ user, onLogout, onToggleSidebar, onNavigate }: HeaderProps) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    phone: user.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const result = await alertsApi.list({ status: 'ACTIVE', limit: 10 });
      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const result = await usersApi.update(user.id, {
        name: profileData.name,
        phone: profileData.phone || undefined,
      });
      if (result.success) {
        toast.success('Profile updated successfully');
        // Update local user state would need to be done through the store
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const result = await usersApi.update(user.id, {
        password: passwordData.newPassword,
      });
      if (result.success) {
        toast.success('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
      } else {
        toast.error(result.error || 'Failed to change password');
      }
    } catch (err) {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await alertsApi.acknowledge(id);
      loadNotifications();
      toast.success('Alert acknowledged');
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'ACTIVE').length;

  return (
    <>
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">
              {user.company?.name || 'Kitchen Quality System'}
            </h2>
            {user.branch && (
              <p className="text-sm text-muted-foreground">{user.branch.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {onNavigate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto py-1 px-2 text-xs"
                    onClick={() => onNavigate('alerts')}
                  >
                    View All
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-64">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcknowledgeAlert(notification.id);
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          OK
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user.name}</p>
                  <Badge variant="outline" className={roleColors[user.role] + ' text-xs py-0 px-1'}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>
              Manage your account information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Badge className={roleColors[user.role]}>
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
              {user.company && (
                <div className="space-y-2">
                  <Label>Company</Label>
                  <p className="text-sm">{user.company.name}</p>
                </div>
              )}
              {user.branch && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <p className="text-sm">{user.branch.name}</p>
                </div>
              )}
              <Button onClick={handleUpdateProfile} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>

            {/* Password Change Section */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="w-full"
              >
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
              {showPasswordSection && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Password
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Application preferences and configurations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Account Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{user.role.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="default">Active</Badge>
                </div>
                {user.company && (
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p className="font-medium">{user.company.name}</p>
                  </div>
                )}
                {user.branch && (
                  <div>
                    <p className="text-muted-foreground">Branch</p>
                    <p className="font-medium">{user.branch.name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium">Preferences</h4>
              <p className="text-sm text-muted-foreground">
                Additional system settings will be available in future updates.
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium">Session</h4>
              <Button variant="outline" onClick={onLogout} className="w-full text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out of all sessions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
