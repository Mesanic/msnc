#!/usr/bin/env bash
# A small app with three separate modules: accounts, billing and email.
set -euo pipefail
mkdir -p src/accounts src/billing src/email
cat > package.json <<'JSON'
{ "name": "shop", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/accounts/users.js <<'JS'
const users = new Map();
export const createUser = (email) => { const u = { id: users.size + 1, email }; users.set(u.id, u); return u; };
export const getUser = (id) => users.get(id);
JS
cat > src/billing/subscriptions.js <<'JS'
// One subscription per user, charged monthly.
const subs = new Map();
export const subscribe = (userId, plan) => subs.set(userId, { plan, seats: 1 });
export const subscriptionOf = (userId) => subs.get(userId);
JS
cat > src/email/send.js <<'JS'
export const send = async (to, subject, body) => console.log(`to=${to} subject=${subject}\n${body}`);
JS
