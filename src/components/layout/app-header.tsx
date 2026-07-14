"use client";

import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuIcon from "@mui/icons-material/Menu";

import { AuthNav } from "@/components/auth-nav";

interface Props {
  onMenuClick: () => void;
  /** Pixels to drop the bar by, to sit under the impersonation banner. 0 normally. */
  offsetTop?: number;
}

/** Fixed top bar shared by every page inside the app shell. */
export function AppHeader({ onMenuClick, offsetTop = 0 }: Props) {
  return (
    <AppBar
      position="fixed"
      sx={{ top: `${offsetTop}px`, zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <GroupsIcon sx={{ mr: 1.5, display: { xs: "none", sm: "block" } }} />
        <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
          TeamUp
        </Typography>
        <AuthNav />
      </Toolbar>
    </AppBar>
  );
}
