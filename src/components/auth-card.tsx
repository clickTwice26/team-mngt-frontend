"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import GroupsIcon from "@mui/icons-material/Groups";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Centered card shell shared by the login and register screens. */
export function AuthCard({ title, subtitle, children }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        py: 6,
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Avatar sx={{ bgcolor: "primary.main", mb: 1.5, width: 48, height: 48 }}>
              <GroupsIcon />
            </Avatar>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
