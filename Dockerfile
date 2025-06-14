# Use official Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies using force to resolve conflicts
COPY package*.json ./
RUN npm install --force

# Copy rest of the code
COPY . .

# Build Next.js app
RUN npm run build

# Expose default Next.js port
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]
