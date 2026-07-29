# ── Builder Stage ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Copy static assets into standalone output
RUN cp -r public .next/standalone/public && \
    cp -r .next/static .next/standalone/.next/static

# ── Runner Stage (slim) ───────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Listen on all interfaces so Render's proxy can reach the app
ENV HOSTNAME=0.0.0.0

# Copy standalone build output (public/ and .next/static/ are already inside
# standalone from the cp step above, so no extra COPY needed)
COPY --from=builder /app/.next/standalone ./

# Expose frontend port
EXPOSE 3000

CMD ["node", "server.js"]
