FROM node:alpine

COPY . /usr/src/app
WORKDIR /usr/src/app
RUN yarn install --check-files
RUN yarn build

EXPOSE 1337
CMD ["yarn", "start"]
