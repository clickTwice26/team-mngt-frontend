"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ApartmentIcon from "@mui/icons-material/Apartment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import { useAuth } from "@/context/auth-context";

export const DRAWER_WIDTH = 240;
export const MINI_DRAWER_WIDTH = 64;

interface NavItem {
  label: string;
  href: string;
  icon: ReactElement;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <DashboardIcon /> },
  { label: "Teams", href: "/teams", icon: <GroupsIcon /> },
];

const SUPER_ADMIN_NAV_ITEM: NavItem = {
  label: "Companies",
  href: "/companies",
  icon: <ApartmentIcon />,
};

const PLATFORM_DEVELOPER_NAV_ITEM: NavItem = {
  label: "Users",
  href: "/users",
  icon: <PeopleAltIcon />,
};

const PROFILE_NAV_ITEM: NavItem = {
  label: "Profile",
  href: "/profile",
  icon: <AccountCircleIcon />,
};

interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/**
 * Collapsible navigation drawer.
 *
 * Desktop (`sm` and up): a permanent mini-variant drawer — collapses to an
 * icon-only rail and expands to full width (toggled from the header's menu
 * button). Mobile: a temporary overlay drawer toggled the same way.
 */
export function Sidebar({ collapsed, mobileOpen, onMobileClose }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const pathname = usePathname();
  const { user } = useAuth();
  const mainNavItems = [
    ...MAIN_NAV_ITEMS,
    ...(user?.is_super_admin ? [SUPER_ADMIN_NAV_ITEM] : []),
    ...(user?.role === "platform_developer" ? [PLATFORM_DEVELOPER_NAV_ITEM] : []),
  ];

  const mini = isDesktop && collapsed;
  const width = collapsed ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

  const renderNavItem = (item: NavItem): ReactNode => {
    const active = pathname === item.href;
    return (
      <ListItem key={item.href} disablePadding sx={{ display: "block" }}>
        <Tooltip title={mini ? item.label : ""} placement="right">
          <ListItemButton
            component={Link}
            href={item.href}
            selected={active}
            onClick={() => {
              if (!isDesktop) onMobileClose();
            }}
            sx={{
              minHeight: 48,
              justifyContent: mini ? "center" : "initial",
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: mini ? 0 : 3,
                justifyContent: "center",
                color: active ? "primary.main" : "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{ opacity: mini ? 0 : 1, whiteSpace: "nowrap" }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar />
      <Divider />
      <List sx={{ flexGrow: 1 }}>{mainNavItems.map(renderNavItem)}</List>
      <Divider />
      <List>{renderNavItem(PROFILE_NAV_ITEM)}</List>
    </Box>
  );

  if (!isDesktop) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        "& .MuiDrawer-paper": {
          width,
          overflowX: "hidden",
          boxSizing: "border-box",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {content}
    </Drawer>
  );
}
