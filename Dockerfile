FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

# mount your pulsewatch.json and a volume for the database here
VOLUME /data
EXPOSE 3000

CMD ["node", "src/index.js", "/data/pulsewatch.json"]
