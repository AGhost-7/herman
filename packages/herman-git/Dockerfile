FROM node:argon

RUN npm install -g herman-git

VOLUME /etc/herman/config.yml

VOLUME /var/lib/herman

COPY ./entrypoint.sh ./entrypoint.sh

ENTRYPOINT ./entrypoint.sh

RUN curl -sSL https://get.docker.com/ | sh

CMD ["herman-git"]
