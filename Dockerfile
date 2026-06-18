# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

LABEL org.opencontainers.image.title="SpeedPNG" \
      org.opencontainers.image.description="SpeedPNG Image Uploader" \
      org.opencontainers.image.source="https://github.com/your-org/speedrppng"

WORKDIR /app

# Copy manifests first so dependency layer is cached independently of source
COPY package.json package-lock.json ./
RUN npm install

# Copy source
COPY . .

# VITE_* vars are baked into the JS bundle at build time.
# Pass them as --build-arg flags or set them in Hyperlift's env panel.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

LABEL org.opencontainers.image.title="SpeedPNG" \
      org.opencontainers.image.description="SpeedPNG Image Uploader"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx recommends SIGQUIT for graceful shutdown (flushes connections)
STOPSIGNAL SIGQUIT

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
