FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npm install prisma@5.22.0
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/docs ./src/docs

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data /app/uploads

EXPOSE 3333

ENTRYPOINT ["docker-entrypoint.sh"]
