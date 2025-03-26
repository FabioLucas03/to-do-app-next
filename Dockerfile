FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Instalar definições de tipos para uuid
RUN npm install --save-dev @types/uuid

EXPOSE 3000

CMD ["npm", "run", "dev"]
