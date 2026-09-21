import * as path from 'path';

// Saved browser sessions (cookies + localStorage). Gitignored via tests/.auth.
// admin.json is written by auth.setup.ts and loaded by every test by default.
export const adminAuthFile = path.join(__dirname, '..', '.auth', 'admin.json');
// user.json is written by a test in 13-auth.spec.ts to demo reusing a second role's session.
export const userAuthFile = path.join(__dirname, '..', '.auth', 'user.json');
