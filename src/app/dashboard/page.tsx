"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ApartmentIcon from "@mui/icons-material/Apartment";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import { BackendStatus } from "@/components/backend-status";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <AppShell>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </AppShell>
    );
  }

  const shortcuts = [
    {
      href: "/teams",
      icon: <GroupsIcon color="primary" fontSize="large" />,
      title: "Teams",
      description: "Members, tasks, meetings, work logs and performance.",
    },
    ...(user.is_super_admin
      ? [
          {
            href: "/companies",
            icon: <ApartmentIcon color="primary" fontSize="large" />,
            title: "Companies",
            description: "Manage companies and their memberships.",
          },
        ]
      : []),
    ...(user.role === "platform_developer"
      ? [
          {
            href: "/users",
            icon: <PeopleAltIcon color="primary" fontSize="large" />,
            title: "Users",
            description: "Every account on the platform.",
          },
        ]
      : []),
    {
      href: "/profile",
      icon: <AccountCircleIcon color="primary" fontSize="large" />,
      title: "Profile",
      description: "Your name, avatar and account details.",
    },
  ];

  return (
    <AppShell>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Welcome back{user.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.
          </Typography>
          <Typography color="text.secondary">
            Jump back into your teams, or check on the rest of the workspace.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          }}
        >
          {shortcuts.map((shortcut) => (
            <Card key={shortcut.href} variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea component={Link} href={shortcut.href} sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ mb: 1 }}>{shortcut.icon}</Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {shortcut.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shortcut.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        <BackendStatus />
      </Stack>
    </AppShell>
  );
}
