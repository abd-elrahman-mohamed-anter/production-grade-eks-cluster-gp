FROM node:20-alpine AS builder
WORKDIR /app
RUN set -e; \
for attempt in 1 2 3 4 5; do \
echo "Attempt $attempt"; \
apk add --no-cache bash git && break; \
sleep 10; \
done || exit 1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
RUN set -e; \
apt-get update && apt-get install -y --no-install-recommends \
dumb-init curl tzdata ca-certificates \
nmap \
perl \
libwww-perl \
libnet-ssleay-perl \
libio-socket-ssl-perl \
libjson-perl \
libxml-writer-perl \
git \
unzip && \
rm -rf /var/lib/apt/lists/* && \
mkdir -p /opt/nikto
RUN git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto && \
chmod +x /opt/nikto/program/nikto.pl && \
echo '#!/bin/sh\nperl /opt/nikto/program/nikto.pl "$@"' > /usr/local/bin/nikto && \
chmod +x /usr/local/bin/nikto

# Install httpx
RUN set -e; \
for attempt in 1 2 3; do \
curl -L -o httpx.zip https://github.com/projectdiscovery/httpx/releases/download/v1.6.7/httpx_1.6.7_linux_amd64.zip && \
unzip httpx.zip && \
mv httpx /usr/local/bin/httpx && \
chmod +x /usr/local/bin/httpx && \
rm httpx.zip && \
break || sleep 5; \
done && \
httpx -version

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY migrations ./migrations
COPY drizzle.config.ts ./
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Verify httpx is available
RUN which httpx && httpx -version

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
