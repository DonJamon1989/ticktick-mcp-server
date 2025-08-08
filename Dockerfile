# Use an official Node.js runtime as a parent image
FROM node:lts-alpine

# Set the working directory
WORKDIR /app

# Copy package.json first and install dependencies
COPY package.json package.json
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Run the application
CMD ["npm", "start"]
