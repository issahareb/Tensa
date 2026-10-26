FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY dist ./dist
COPY private ./private
ENV NODE_ENV=production
CMD ["node", "server/server.mjs"]
