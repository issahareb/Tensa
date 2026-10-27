FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY dist ./dist
COPY private ./private
ENV NODE_ENV=production
CMD ["node", "server/server.mjs"]
