FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM nginxinc/nginx-unprivileged:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html

USER 0
RUN chmod +x /docker-entrypoint.sh \
    && chown -R 101:0 /usr/share/nginx/html \
    && chmod -R g=u /usr/share/nginx/html \
    && chmod g+rx /docker-entrypoint.sh

USER 101

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]