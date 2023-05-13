FROM docker.io/lukechannings/deno:v1.33.3

WORKDIR /src
EXPOSE 3000

COPY deno.json /src/
COPY deno.lock /src/
COPY server.ts /src/

CMD ["task", "start"]
