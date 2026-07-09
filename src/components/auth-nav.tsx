"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import LogoutIcon from "@mui/icons-material/Logout";

import { useAuth } from "@/context/auth-context";

export function AuthNav() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (loading) {
    return <Skeleton variant="circular" width={36} height={36} />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button color="inherit" component={Link} href="/login">
          Sign in
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          component={Link}
          href="/register"
        >
          Sign up
        </Button>
      </Box>
    );
  }

  const initial = (user.full_name || user.email).charAt(0).toUpperCase();

  return (
    <Box>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
        <Avatar
          src={user.avatar_url ?? undefined}
          sx={{ width: 36, height: 36, bgcolor: "secondary.main" }}
        >
          {initial}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {user.full_name ?? "Signed in"}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            logout();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}
