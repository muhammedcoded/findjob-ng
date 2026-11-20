FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json .
COPY server.mjs db.mjs lib.mjs sources.mjs cms.mjs cron.mjs ./
COPY public ./public
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
