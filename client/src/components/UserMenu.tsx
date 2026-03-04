import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, User, Key, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface UserMenuProps {
  username?: string;
  onProfileClick?: () => void;
  onApiKeysClick?: () => void;
}

export default function UserMenu({ onProfileClick, onApiKeysClick }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const displayName = user?.username || "User";

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            data-testid="button-user-menu"
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{displayName}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={onProfileClick}
            className="flex items-center gap-2 cursor-pointer"
            data-testid="menu-item-profile"
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onApiKeysClick}
            className="flex items-center gap-2 cursor-pointer"
            data-testid="menu-item-api-keys"
          >
            <Key className="w-4 h-4" />
            <span>API Keys</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            data-testid="menu-item-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
