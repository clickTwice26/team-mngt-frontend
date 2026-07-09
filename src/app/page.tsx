import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ApiIcon from "@mui/icons-material/Api";
import LaunchIcon from "@mui/icons-material/Launch";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import StorageIcon from "@mui/icons-material/Storage";
import WebIcon from "@mui/icons-material/Web";

import { BackendStatus } from "@/components/backend-status";
import { AppShell } from "@/components/layout/app-shell";
import { env } from "@/config/env";

const features = [
  {
    icon: <ApiIcon color="primary" fontSize="large" />,
    title: "FastAPI backend",
    description:
      "Async, typed API with a clean layered architecture: routers → services → repositories.",
  },
  {
    icon: <StorageIcon color="primary" fontSize="large" />,
    title: "MongoDB",
    description:
      "Powered by the official async PyMongo driver with Pydantic v2 models and indexes.",
  },
  {
    icon: <WebIcon color="primary" fontSize="large" />,
    title: "Next.js + Material UI",
    description:
      "App Router, TypeScript and a system-wide Material Design theme wired to the backend.",
  },
];

export default function Home() {
  return (
    <AppShell>
      <Container maxWidth="md" disableGutters>
        <Stack spacing={4}>
          <Stack spacing={2}>
            <Box>
              <Chip label="Team Management · Monorepo" color="secondary" size="small" />
            </Box>
            <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
              Full-stack starter, ready to build on.
            </Typography>
            <Typography
              variant="h6"
              component="p"
              color="text.secondary"
              sx={{ fontWeight: 400 }}
            >
              A professional baseline pairing a FastAPI + MongoDB backend with a
              Next.js frontend styled entirely with Material UI. Everything is
              wired together — start shipping features, not boilerplate.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<MenuBookIcon />}
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
            >
              Open API docs
            </Button>
            <Button
              variant="outlined"
              size="large"
              endIcon={<LaunchIcon />}
              href={env.apiUrl}
              target="_blank"
              rel="noreferrer"
            >
              Backend root
            </Button>
          </Stack>

          <BackendStatus />

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
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
    </AppShell>
  );
}
