FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5500

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get({hostname:'localhost',port:5500,path:'/health',headers:{'User-Agent':'Docker-Healthcheck'}}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

FROM base AS development
USER root
RUN npm ci && npm cache clean --force
USER nodejs
CMD ["npm", "run", "dev"]

FROM base AS builder
USER root
RUN npm ci && npm run build && npm cache clean --force

FROM base AS production
COPY --from=builder /app/dist ./dist
CMD ["npm", "start"]