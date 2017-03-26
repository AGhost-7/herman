FROM node:argon

RUN npm install -g herman-git

VOLUME /etc/herman/config.yml

VOLUME /var/lib/herman

COPY ./entrypoint.sh ./entrypoint.sh

ENTRYPOINT ./entrypoint.sh

CMD ["herman-git"]
