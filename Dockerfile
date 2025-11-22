FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p server/public && cp -r dist/public server/public
ENV NODE_ENV=production
CMD ["npm", "run", "start"]