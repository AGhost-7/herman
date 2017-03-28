FROM node:boron

RUN npm install -g herman-github

COPY ./entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["herman-github"]
