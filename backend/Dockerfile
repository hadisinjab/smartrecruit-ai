# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

EXPOSE 5002

CMD ["npm", "start"]