"use client";

import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import ScheduleIcon from "@mui/icons-material/Schedule";

import { useAuth } from "@/context/auth-context";

const features = [
  {
    icon: <GroupsIcon color="primary" fontSize="large" />,
    title: "Teams & members",
    description:
      "Group people into teams under a company, with roles and per-member work arrangements.",
  },
  {
    icon: <AssignmentIcon color="primary" fontSize="large" />,
    title: "Tasks",
    description:
      "Assign work, track status, and keep the discussion on the task itself with threaded comments and attachments.",
  },
  {
    icon: <EventIcon color="primary" fontSize="large" />,
    title: "Meetings",
    description:
      "Schedule meetings, capture notes and decisions, and keep every attendee on the same page.",
  },
  {
    icon: <ScheduleIcon color="primary" fontSize="large" />,
    title: "Work logs",
    description:
      "Log hours against a calendar so it stays clear who worked on what, and when.",
  },
  {
    icon: <InsightsIcon color="primary" fontSize="large" />,
    title: "Performance",
    description:
      "Charts over logged hours and completed tasks, per member — no spreadsheet required.",
  },
];

/**
 * Public landing page. Deliberately outside `AppShell`: a signed-out visitor
 * gets a marketing page instead of the app's sidebar and dashboard. Once signed
 * in, the CTAs point into the app at /dashboard.
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <GroupsIcon color="primary" sx={{ mr: 1.5 }} />
          <Typography
            variant="h6"
            component={Link}
            href="/"
            noWrap
            sx={{ flexGrow: 1, color: "text.primary", textDecoration: "none" }}
          >
            Team Management
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" width={150} height={36} />
          ) : isAuthenticated ? (
            <Button variant="contained" component={Link} href="/dashboard">
              Go to dashboard
            </Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button component={Link} href="/login">
                Sign in
              </Button>
              <Button variant="contained" component={Link} href="/register">
                Sign up
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Tint the hero from the theme's primary rather than a hard-coded
          // color, so it follows the palette if that ever changes.
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 320px)`,
        }}
      >
        <Container maxWidth="md" sx={{ py: { xs: 6, sm: 10 } }}>
          <Stack spacing={6}>
            <Stack spacing={3} sx={{ textAlign: { xs: "left", sm: "center" } }}>
              <Box>
                <Chip label="Team Management" color="secondary" size="small" />
              </Box>
              <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
                Run your teams, not your spreadsheets.
              </Typography>
              <Typography
                variant="h6"
                component="p"
                color="text.secondary"
                sx={{ fontWeight: 400, maxWidth: 640, mx: { sm: "auto" } }}
              >
                Teams, tasks, meetings, work logs and performance in one place.
                Everyone gets the same view of who is doing what — and how the work
                is actually going.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ pt: 1, justifyContent: { sm: "center" } }}
              >
                <Button
                  variant="contained"
                  size="large"
                  component={Link}
                  href={isAuthenticated ? "/dashboard" : "/register"}
                  endIcon={<ArrowForwardIcon />}
                >
                  {isAuthenticated ? "Go to dashboard" : "Get started"}
                </Button>
                {!isAuthenticated && (
                  <Button variant="outlined" size="large" component={Link} href="/login">
                    Sign in
                  </Button>
                )}
              </Stack>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
              }}
            >
              {features.map((feature) => (
                <Card key={feature.title} variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Box sx={{ mb: 1 }}>{feature.icon}</Box>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Stack>
        </Container>
      </Box>

      <Divider />
      <Box component="footer" sx={{ py: 3 }}>
        <Container maxWidth="md">
          <Typography variant="body2" color="text.secondary" align="center">
            Team Management — FastAPI · MongoDB · Next.js
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
