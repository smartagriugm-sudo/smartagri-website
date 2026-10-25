// Site-wide feature switches.
//
// AI Assistant (chat, generate, knowledge base) is hidden for now: its links
// are removed from the header and footer and every /ai page redirects away.
// The code and data stay in place; flip this to true to bring it back.
export const AI_ASSISTANT_ENABLED = false;

// Where sign-in sends people when no redirect is given: the landing page.
// A page that asked for sign-in (e.g. /kanban) still gets them back.
export const DEFAULT_SIGNED_IN_PATH = "/";
