"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { MembershipUser } from "@/types/membership";

/** How many matches the dropdown shows at once. */
const MAX_SUGGESTIONS = 6;

/**
 * Encode a picked person as the token the message stores.
 *
 * It's a Markdown link with a `mention:` href — `[@Ada Lovelace](mention:507f…)`.
 * The `Markdown` renderer turns that back into a highlighted, non-navigating
 * chip. Square brackets in a name would break the link syntax, so they're
 * dropped; the id is what actually identifies the person.
 */
export function mentionToken(user: MembershipUser): string {
  const name = (user.full_name || user.email).replace(/[[\]]/g, "");
  return `[@${name}](mention:${user.id})`;
}

function initials(name: string | null, email: string): string {
  return (name?.trim() || email).slice(0, 1).toUpperCase();
}

interface Trigger {
  /** Index of the `@` that opened this mention. */
  start: number;
  /** Text typed after the `@`, up to the caret. */
  query: string;
  /** Caret position when the trigger was read. */
  caret: number;
}

/**
 * The @-word immediately left of the caret, if the caret is inside one.
 *
 * A mention starts at a `@` that sits at the very start of the text or right
 * after whitespace, and runs to the caret with no whitespace in between — so
 * an email address's `@` (which follows a letter) never triggers it.
 */
function activeTrigger(text: string, caret: number): Trigger | null {
  for (let i = caret - 1; i >= 0; i -= 1) {
    const ch = text[i];
    if (ch === "@") {
      const before = i === 0 ? " " : text[i - 1];
      if (!/\s/.test(before)) return null;
      return { start: i, query: text.slice(i + 1, caret), caret };
    }
    // Whitespace before an `@` means the caret isn't in a mention word.
    if (/\s/.test(ch)) return null;
  }
  return null;
}

function match(user: MembershipUser, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (user.full_name?.toLowerCase().includes(q) ?? false) ||
    user.email.toLowerCase().includes(q)
  );
}

/**
 * A multiline text field with an `@`-triggered people picker.
 *
 * A drop-in for the composer's `TextField`: it owns its own dropdown but
 * forwards `onKeyDown`/`onPaste` to the composer for everything the dropdown
 * isn't handling (Enter-to-send, image paste). When `suggestions` is empty it
 * behaves as a plain field — the dropdown simply never opens.
 */
export function MentionInput({
  value,
  onChange,
  suggestions,
  placeholder,
  autoFocus,
  minRows = 2,
  helperText,
  onKeyDown,
  onPaste,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  suggestions: MembershipUser[];
  placeholder: string;
  autoFocus?: boolean;
  minRows?: number;
  helperText?: string;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** Native paste on the underlying textarea. Attached directly to the DOM node
   *  (not via a React prop) because MUI routes unknown handlers to the wrapper,
   *  not the input — which made clipboard paste unreliable. */
  onPaste?: (event: ClipboardEvent) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // The wrapper element the dropdown anchors to and matches width with. Held in
  // state (not a ref) so it's readable during render without tripping the
  // refs-in-render rule, and so the Popper re-renders once it's mounted.
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Caret to restore after we rewrite `value` on selecting a person, applied
  // once the new value has rendered.
  const pendingCaret = useRef<number | null>(null);

  const matches =
    trigger === null
      ? []
      : suggestions.filter((u) => match(u, trigger.query)).slice(0, MAX_SUGGESTIONS);
  const open = matches.length > 0;

  // Paste has to bind to the real <textarea>, not the MUI wrapper.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || !onPaste) return;
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [onPaste]);

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [value]);

  /** Recompute the trigger from wherever the caret now is. */
  const syncTrigger = () => {
    const el = inputRef.current;
    if (!el) return;
    const next = activeTrigger(el.value, el.selectionStart ?? el.value.length);
    setTrigger(next);
    setActiveIndex(0);
  };

  const pick = (user: MembershipUser) => {
    const el = inputRef.current;
    if (!trigger || !el) return;
    const caret = el.selectionStart ?? trigger.caret;
    const insert = `${mentionToken(user)} `;
    const before = value.slice(0, trigger.start);
    const after = value.slice(caret);
    pendingCaret.current = before.length + insert.length;
    setTrigger(null);
    onChange(before + insert + after);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (open) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((i) => (i + 1) % matches.length);
          return;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
          return;
        case "Enter":
        case "Tab":
          // Enter here accepts the highlighted person; it must not reach the
          // composer, or it would also send the message.
          event.preventDefault();
          pick(matches[activeIndex]);
          return;
        case "Escape":
          event.preventDefault();
          setTrigger(null);
          return;
      }
    }
    onKeyDown?.(event);
  };

  return (
    <Box ref={setAnchorEl} sx={{ position: "relative" }}>
      <TextField
        multiline
        minRows={minRows}
        fullWidth
        size="small"
        inputRef={inputRef}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          syncTrigger();
        }}
        onKeyUp={syncTrigger}
        onClick={syncTrigger}
        onKeyDown={handleKeyDown}
        onBlur={() => setTrigger(null)}
        helperText={helperText}
      />

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ width: anchorEl?.clientWidth, zIndex: 1400 }}
      >
        <ClickAwayListener onClickAway={() => setTrigger(null)}>
          <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 260, overflowY: "auto" }}>
            <MenuList dense disablePadding>
              {matches.map((user, i) => (
                <MenuItem
                  key={user.id}
                  selected={i === activeIndex}
                  // Keep the field focused so selecting doesn't blur-close first.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(user)}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Avatar
                      src={user.avatar_url ?? undefined}
                      sx={{ width: 24, height: 24, fontSize: 12 }}
                    >
                      {initials(user.full_name, user.email)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {user.full_name || user.email}
                      </Typography>
                      {user.full_name && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {user.email}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </MenuList>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
