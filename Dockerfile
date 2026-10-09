FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY db ./db
COPY src ./src
COPY public ./public

USER node
EXPOSE 3000

CMD ["node", "src/server.js"]
