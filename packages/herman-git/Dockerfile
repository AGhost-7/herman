FROM node:boron

RUN npm install -g herman-git

VOLUME /var/lib/herman

COPY ./entrypoint.sh ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

RUN curl -sSL https://get.docker.com/ | sh

CMD ["herman-git"]
