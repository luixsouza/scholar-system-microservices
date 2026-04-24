FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN ./node_modules/.bin/ng build --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist/escolar-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
