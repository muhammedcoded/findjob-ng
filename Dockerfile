FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs db.mjs lib.mjs sources.mjs cms.mjs billing.mjs cron.mjs exports.mjs matching.mjs ./
COPY public ./public
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
