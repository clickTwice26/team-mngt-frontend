"use client";

import Link from "next/link";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventIcon from "@mui/icons-material/Event";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ForumIcon from "@mui/icons-material/Forum";
import GroupsIcon from "@mui/icons-material/Groups";
import HistoryIcon from "@mui/icons-material/History";
import InsightsIcon from "@mui/icons-material/Insights";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { useAuth } from "@/context/auth-context";

/** Anchors in the top nav. Kept in sync with the `id`s on the sections below. */
const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Who it's for", href: "#who-its-for" },
  { label: "FAQ", href: "#faq" },
];

const valueProps = [
  {
    title: "Everything in one place",
    description:
      "Teams, tasks, meetings, hours and performance live together — not scattered across a chat app, a spreadsheet and someone's inbox.",
  },
  {
    title: "Accountable by default",
    description:
      "Work is assigned to people, hours are logged against real time windows, and the discussion stays attached to the work it belongs to.",
  },
  {
    title: "Clarity for everyone",
    description:
      "Members see what's theirs. Founders see how the team is actually tracking. Nobody has to ask for a status update.",
  },
];

const features = [
  {
    icon: <GroupsIcon color="primary" fontSize="large" />,
    title: "Teams & members",
    description:
      "Group people into teams under a company. Each member gets a work arrangement that reflects how they actually work — hourly with a weekly target, task-based, or on a contract.",
  },
  {
    icon: <AssignmentIcon color="primary" fontSize="large" />,
    title: "Tasks",
    description:
      "Assign work to one person or several, set a priority and a deadline, and move it from To do to In progress to Done. Overdue work flags itself.",
  },
  {
    icon: <ForumIcon color="primary" fontSize="large" />,
    title: "Discussion in context",
    description:
      "Every task, meeting and time entry has its own threaded discussion. The decision lives next to the work, so nobody has to go hunting for why something changed.",
  },
  {
    icon: <EventIcon color="primary" fontSize="large" />,
    title: "Meetings",
    description:
      "Set an agenda, invite the team or a few people, and keep the notes on the meeting itself. The join button goes live exactly when the meeting does.",
  },
  {
    icon: <ScheduleIcon color="primary" fontSize="large" />,
    title: "Work logs",
    description:
      "Log hours as real time windows on a calendar, link them to the task they belong to, and attach proof of work. Overlapping entries are rejected, so the numbers hold up.",
  },
  {
    icon: <InsightsIcon color="primary" fontSize="large" />,
    title: "Performance",
    description:
      "See tasks assigned, completed and overdue at a glance, with daily and weekly hours charted against each member's target.",
  },
  {
    icon: <HistoryIcon color="primary" fontSize="large" />,
    title: "Activity trail",
    description:
      "Every change to a team — tasks, meetings, hours, membership — is recorded as it happens, in plain language that stays readable long after the fact.",
  },
  {
    icon: <AttachFileIcon color="primary" fontSize="large" />,
    title: "Attachments & docs",
    description:
      "Drop in images, screen recordings, voice notes, PDFs and written specs. Read the specs in the app, or take them away as a clean PDF.",
  },
];

const personas = [
  {
    title: "For the team member",
    lines: [
      "A clear list of what's assigned to you, and what's overdue.",
      "Log your hours on a calendar in a few clicks.",
      "Ask the question on the task, not in a thread nobody can find later.",
    ],
  },
  {
    title: "For the team lead",
    lines: [
      "Set the agenda, capture the notes, keep the decisions.",
      "See where a task actually is without chasing anyone.",
      "Keep the deadline and the discussion in the same place.",
    ],
  },
  {
    title: "For the founder",
    lines: [
      "See logged hours across the team, not just your own.",
      "Read the full activity trail of what changed and when.",
      "Know how the work is tracking before the week is over.",
    ],
  },
];

const steps = [
  {
    number: "1",
    title: "Set up your company and teams",
    description:
      "Create a company, spin up the teams inside it, and add the people who belong there. Each member gets the work arrangement that matches their role.",
  },
  {
    number: "2",
    title: "Put the work in",
    description:
      "Add tasks with owners, priorities and deadlines. Schedule the meetings. Everything the team is doing now lives on one page.",
  },
  {
    number: "3",
    title: "Watch it come together",
    description:
      "People log hours and close tasks as they go. The charts, the calendar and the activity trail fill in on their own — no weekly status ritual required.",
  },
];

const faqs = [
  {
    question: "Is this a task tracker or a time tracker?",
    answer:
      "Both, and that's the point. A task tracker on its own tells you what's planned; a time tracker on its own tells you where the hours went. Keeping them together means you can see whether the two agree.",
  },
  {
    question: "Do people have to log their hours?",
    answer:
      "Only if that's how they work. Members on an hourly arrangement log time against a weekly target. Task-based and contract members don't log hours at all — they're measured on the work itself.",
  },
  {
    question: "Can I trust the hours that get logged?",
    answer:
      "Entries are real start-to-end time windows, not a number typed into a box. Two entries can't overlap, an entry can be linked to the task it was spent on, and a member can attach a screen recording or a file as proof of work.",
  },
  {
    question: "Who can see what?",
    answer:
      "Members see their own team, their own tasks and their own hours. Founders get oversight — logged hours across the team and the full activity trail. Nothing is hidden from the people doing the work.",
  },
  {
    question: "Can comments be deleted after an argument?",
    answer:
      "Only for a short window after posting, so you can fix a typo or take back a message you sent by mistake. After that, the discussion stands as a record.",
  },
  {
    question: "What happens to the notes and specs we write?",
    answer:
      "Written documents are readable directly in the app — diagrams included — and can be downloaded as a clean, print-quality PDF whenever you need to send one out.",
  },
];

/** Illustrative task rows for the tasks section. Static, not live data. */
const sampleTasks = [
  { title: "Ship the onboarding flow", status: "In progress", priority: "High", people: ["A", "R"] },
  { title: "Rewrite the pricing page", status: "To do", priority: "Medium", people: ["M"] },
  { title: "Fix the invoice rounding", status: "Done", priority: "Urgent", people: ["S", "K"] },
];

/** Illustrative weekly bars for the performance section. Static, not live data. */
const sampleBars = [40, 65, 55, 80, 72, 90, 60, 85];

/**
 * Public landing page. Deliberately outside `AppShell`: a signed-out visitor
 * gets a marketing page instead of the app's sidebar and dashboard. Once signed
 * in, the CTAs point into the app at /dashboard.
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  const primaryHref = isAuthenticated ? "/dashboard" : "/register";
  const primaryLabel = isAuthenticated ? "Go to dashboard" : "Get started";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          // Frosted bar so the hero tint shows through as the page scrolls under it.
          backdropFilter: "blur(8px)",
          backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.85),
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Toolbar>
            <GroupsIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography
              variant="h6"
              component={Link}
              href="/"
              noWrap
              sx={{ color: "text.primary", textDecoration: "none" }}
            >
              TeamUp
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              sx={{ flexGrow: 1, ml: 4, display: { xs: "none", md: "flex" } }}
            >
              {navLinks.map((link) => (
                <Button key={link.href} href={link.href} color="inherit" size="small">
                  {link.label}
                </Button>
              ))}
            </Stack>
            <Box sx={{ flexGrow: 1, display: { xs: "block", md: "none" } }} />

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
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {/* ---------------------------------------------------------------- Hero */}
        <Box
          sx={{
            // Tint the hero from the theme's primary rather than a hard-coded
            // color, so it follows the palette if that ever changes.
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 420px)`,
          }}
        >
          <Container maxWidth="md" sx={{ pt: { xs: 7, sm: 12 }, pb: { xs: 6, sm: 9 } }}>
            <Stack spacing={3} sx={{ textAlign: { xs: "left", sm: "center" } }}>
              <Box>
                <Chip label="Team collaboration, simplified" color="secondary" size="small" />
              </Box>
              <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
                Run your teams, not your spreadsheets.
              </Typography>
              <Typography
                variant="h6"
                component="p"
                color="text.secondary"
                sx={{ fontWeight: 400, maxWidth: 660, mx: { sm: "auto" } }}
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
                  href={primaryHref}
                  endIcon={<ArrowForwardIcon />}
                >
                  {primaryLabel}
                </Button>
                {!isAuthenticated && (
                  <Button variant="outlined" size="large" component={Link} href="/login">
                    Sign in
                  </Button>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Create an account and set up your first team in minutes.
              </Typography>
            </Stack>
          </Container>
        </Box>

        {/* -------------------------------------------------------- Value props */}
        <Container maxWidth="lg" sx={{ pb: { xs: 7, sm: 10 } }}>
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            }}
          >
            {valueProps.map((prop) => (
              <Stack key={prop.title} spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {prop.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {prop.description}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Container>

        {/* ----------------------------------------------------------- Features */}
        <Box id="features" sx={{ bgcolor: "background.paper", borderTop: 1, borderBottom: 1, borderColor: "divider" }}>
          <Container maxWidth="lg" sx={{ py: { xs: 7, sm: 11 } }}>
            <Stack spacing={6}>
              <Stack spacing={2} sx={{ textAlign: "center", maxWidth: 720, mx: "auto" }}>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                  Everything the team needs
                </Typography>
                <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                  One workspace, from the first task to the weekly review.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  No add-ons to buy, no second tool to keep in sync. The plan, the
                  conversation, the hours and the outcome all live on the same page.
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                }}
              >
                {features.map((feature) => (
                  <Card key={feature.title} variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      <Box sx={{ mb: 1 }}>{feature.icon}</Box>
                      <Typography variant="h6" component="h3" gutterBottom>
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

        {/* ------------------------------------------------- Deep dive: the work */}
        <Container maxWidth="lg" sx={{ py: { xs: 7, sm: 11 } }}>
          <Stack spacing={{ xs: 8, md: 12 }}>
            <FeatureSplit
              overline="The work"
              title="Assigned, discussed and finished in one place."
              body="A task carries everything it needs: who owns it, how urgent it is, when it's due, and the whole conversation that got it over the line. When it slips, it says so."
              points={[
                "Owners, priorities and deadlines on every task",
                "Threaded discussion attached to the task itself",
                "Overdue work flags itself — no reminder needed",
                "Files, screenshots and specs where the work is",
              ]}
              visual={
                <Stack spacing={1.5}>
                  {sampleTasks.map((task) => (
                    <Paper key={task.title} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                            {task.title}
                          </Typography>
                          <Stack direction="row" spacing={0.75}>
                            <Chip
                              label={task.status}
                              size="small"
                              color={task.status === "Done" ? "success" : "default"}
                              variant={task.status === "In progress" ? "filled" : "outlined"}
                            />
                            <Chip label={task.priority} size="small" variant="outlined" />
                          </Stack>
                        </Stack>
                        <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 13 } }}>
                          {task.people.map((person) => (
                            <Avatar key={person}>{person}</Avatar>
                          ))}
                        </AvatarGroup>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              }
            />

            <FeatureSplit
              reverse
              overline="The hours"
              title="Time that actually adds up."
              body="Hours are logged as real time windows on a calendar, not guessed at on a Friday afternoon. Entries can't overlap, they can point at the task they were spent on, and they can carry proof."
              points={[
                "Log a start and an end, on the day it happened",
                "Overlapping entries are rejected outright",
                "Link an entry to the task it belongs to",
                "Attach a screen recording or file as proof of work",
                "Track the week against each member's target",
              ]}
              visual={
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: "space-between", alignItems: "baseline" }}
                    >
                      <Typography variant="subtitle2">This week</Typography>
                      <Typography variant="body2" color="text.secondary">
                        28h of 40h
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={70} sx={{ height: 8, borderRadius: 1 }} />
                    <Divider />
                    <Stack spacing={1.5}>
                      {[
                        { day: "Mon", detail: "Onboarding flow · 6h 15m" },
                        { day: "Tue", detail: "Pricing page copy · 5h 00m" },
                        { day: "Wed", detail: "Invoice rounding fix · 7h 30m" },
                      ].map((entry) => (
                        <Stack
                          key={entry.day}
                          direction="row"
                          spacing={2}
                          sx={{ alignItems: "center" }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ width: 32 }}>
                            {entry.day}
                          </Typography>
                          <ScheduleIcon fontSize="small" color="primary" />
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
                            {entry.detail}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              }
            />

            <FeatureSplit
              overline="The picture"
              title="See how the work is really going."
              body="Assigned, completed, overdue, and the hours behind them — charted per member and per week. Alongside it, an activity trail of everything that changed, written in plain language as it happened."
              points={[
                "Tasks assigned, completed and overdue at a glance",
                "Daily and weekly hours against the target",
                "A full trail of what changed, and when",
                "Still readable long after the details are forgotten",
              ]}
              visual={
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: "repeat(3, 1fr)",
                      }}
                    >
                      {[
                        { label: "Assigned", value: "24" },
                        { label: "Completed", value: "18" },
                        { label: "Overdue", value: "2" },
                      ].map((stat) => (
                        <Stack key={stat.label} spacing={0.25}>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {stat.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {stat.label}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>
                    <Divider />
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Hours per week
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ height: 96, alignItems: "flex-end" }}
                      >
                        {sampleBars.map((height, index) => (
                          <Box
                            key={index}
                            sx={{
                              flexGrow: 1,
                              height: `${height}%`,
                              borderRadius: 1,
                              bgcolor: (theme) =>
                                alpha(theme.palette.primary.main, 0.35 + (height / 100) * 0.5),
                            }}
                          />
                        ))}
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              }
            />
          </Stack>
        </Container>

        {/* -------------------------------------------------------- Who it's for */}
        <Box
          id="who-its-for"
          sx={{ bgcolor: "background.paper", borderTop: 1, borderBottom: 1, borderColor: "divider" }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 7, sm: 11 } }}>
            <Stack spacing={6}>
              <Stack spacing={2} sx={{ textAlign: "center", maxWidth: 720, mx: "auto" }}>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                  Who it&apos;s for
                </Typography>
                <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                  The same page, whichever seat you sit in.
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                }}
              >
                {personas.map((persona) => (
                  <Card key={persona.title} variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {persona.title}
                      </Typography>
                      <Stack spacing={1.25} sx={{ mt: 2 }}>
                        {persona.lines.map((line) => (
                          <Stack key={line} direction="row" spacing={1.25}>
                            <VisibilityIcon fontSize="small" color="primary" sx={{ mt: 0.25 }} />
                            <Typography variant="body2" color="text.secondary">
                              {line}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Stack>
          </Container>
        </Box>

        {/* ------------------------------------------------------- How it works */}
        <Container id="how-it-works" maxWidth="lg" sx={{ py: { xs: 7, sm: 11 } }}>
          <Stack spacing={6}>
            <Stack spacing={2} sx={{ textAlign: "center", maxWidth: 720, mx: "auto" }}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                How it works
              </Typography>
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                Up and running in three steps.
              </Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 4,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              }}
            >
              {steps.map((step) => (
                <Stack key={step.number} spacing={2}>
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      width: 44,
                      height: 44,
                      fontWeight: 700,
                    }}
                  >
                    {step.number}
                  </Avatar>
                  <Typography variant="h6" component="h3">
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Stack>
        </Container>

        {/* ---------------------------------------------------------------- FAQ */}
        <Box id="faq" sx={{ bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
          <Container maxWidth="md" sx={{ py: { xs: 7, sm: 11 } }}>
            <Stack spacing={5}>
              <Stack spacing={2} sx={{ textAlign: "center" }}>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                  Questions
                </Typography>
                <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                  The things people ask first.
                </Typography>
              </Stack>

              <Box>
                {faqs.map((faq) => (
                  <Accordion key={faq.question} disableGutters variant="outlined" elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Stack>
          </Container>
        </Box>

        {/* ------------------------------------------------------------ Final CTA */}
        <Box
          sx={{
            background: (theme) =>
              `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
          }}
        >
          <Container maxWidth="sm" sx={{ py: { xs: 8, sm: 12 }, textAlign: "center" }}>
            <Stack spacing={3} sx={{ alignItems: "center" }}>
              <CheckCircleIcon color="primary" sx={{ fontSize: 48 }} />
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                Stop chasing status updates.
              </Typography>
              <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400 }}>
                Give your team one place to work, and give yourself an honest view of
                how it&apos;s going.
              </Typography>
              <Button
                variant="contained"
                size="large"
                component={Link}
                href={primaryHref}
                endIcon={<ArrowForwardIcon />}
              >
                {primaryLabel}
              </Button>
            </Stack>
          </Container>
        </Box>
      </Box>

      <Divider />
      <Box component="footer" sx={{ py: 5 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <GroupsIcon color="primary" fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                TeamUp
              </Typography>
              <Typography variant="body2" color="text.secondary">
                — team collaboration, simplified.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              {navLinks.map((link) => (
                <Button key={link.href} href={link.href} size="small" color="inherit">
                  {link.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

/**
 * One alternating "copy on one side, illustration on the other" block. `reverse`
 * flips the sides on desktop only — on mobile the copy always comes first, so the
 * page still reads top-to-bottom.
 */
function FeatureSplit({
  overline,
  title,
  body,
  points,
  visual,
  reverse = false,
}: {
  overline: string;
  title: string;
  body: string;
  points: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: { xs: 4, md: 8 },
        alignItems: "center",
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
      }}
    >
      <Stack spacing={2} sx={{ order: { md: reverse ? 2 : 1 } }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
          {overline}
        </Typography>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {body}
        </Typography>
        <Stack spacing={1.25} sx={{ pt: 1 }}>
          {points.map((point) => (
            <Stack key={point} direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
              <CheckCircleIcon fontSize="small" color="primary" sx={{ mt: 0.25 }} />
              <Typography variant="body2">{point}</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Box sx={{ order: { md: reverse ? 1 : 2 } }}>{visual}</Box>
    </Box>
  );
}
