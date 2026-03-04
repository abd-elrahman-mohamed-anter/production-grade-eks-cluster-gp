import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bell, Eye, EyeOff, Users, Save } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings as SettingsType } from "@shared/schema";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [editUsername, setEditUsername] = useState<string>(user?.username || "");
  const [editPassword, setEditPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [localSettings, setLocalSettings] = useState({
    emailNotifications: true,
  });

  const { data: settings, isLoading } = useQuery<SettingsType & { apiKey: string }>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        emailNotifications: settings.emailNotifications ?? true,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SettingsType>) => {
      const response = await apiRequest("PATCH", "/api/settings", updates);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/auth/delete-account");
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently removed.",
      });
      logout();
      window.location.href = "/login";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async (data: { username?: string; password?: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/update", data);
      return response;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Account Updated", description: "Your account details were updated." });
      setEditPassword("");
      try {
        await refreshAuth();
      } catch (e) {
        // ignore
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update account", variant: "destructive" });
    },
  });

  const handleSaveSettings = () => {
    updateMutation.mutate(localSettings);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-settings">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      <div className="grid gap-6">
        <Card className="bg-card border-card-border border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Users className="w-5 h-5" />
              Account Management
            </CardTitle>
            <CardDescription>
              Manage your personal account and data portability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input
                    type="text"
                    value={user?.username || ""}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value="••••••••"
                  readOnly
                  className="mt-1 bg-muted"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <AlertDialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Change</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Change Username or Password</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-username">Username</Label>
                        <Input
                          id="edit-username"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder={user?.username || "Username"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-password">New Password (leave empty to keep current)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="edit-password"
                            type={showNewPassword ? "text" : "password"}
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="••••••••"
                            className="flex-1"
                            autoComplete="new-password"
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => setShowNewPassword((s) => !s)}
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => { setEditUsername(user?.username || ""); setEditPassword(""); }}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          updateAccountMutation.mutate({ 
                            username: editUsername !== user?.username ? editUsername : undefined, 
                            password: editPassword || undefined 
                          });
                          setShowChangeDialog(false);
                        }}
                        disabled={updateAccountMutation.isPending || (!editPassword && editUsername === user?.username)}
                      >
                        {updateAccountMutation.isPending ? "Saving..." : "Save Changes"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4 pt-2">
                        <p>
                          This action will permanently delete the account for <strong>{user?.username}</strong> and all associated data.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-username">Type your username to confirm:</Label>
                          <Input
                            id="confirm-username"
                            placeholder={user?.username}
                            value={confirmUsername}
                            onChange={(e) => setConfirmUsername(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmUsername("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAccountMutation.mutate()}
                        disabled={confirmUsername !== user?.username || deleteAccountMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Permanently Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <Separator />
          </CardContent>
        </Card>

        {/* Scan settings removed — scan configuration lives on the Scan page (ScanNow). */}

        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Control how you receive alerts and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive email alerts when scans complete
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={localSettings.emailNotifications}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, emailNotifications: checked }))}
                data-testid="switch-email-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
