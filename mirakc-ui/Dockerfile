FROM docker.io/lukechannings/deno:v1.33.3

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.1.0.tar.gz | tar -xz --strip-components 1
RUN deno cache main.ts --import-map=import_map.json

CMD ["run", "-A", "main.ts"]
