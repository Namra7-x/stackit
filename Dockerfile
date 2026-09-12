# StackIt fullstack image: builds the React client, serves it + the API via Express.
# Works on Hugging Face Spaces (Docker SDK, listens on $PORT/7860), Koyeb, Render, etc.
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN npm --prefix server install --omit=dev --no-audit --no-fund
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
WORKDIR /app/server
EXPOSE 7860
CMD ["npm", "start"]
