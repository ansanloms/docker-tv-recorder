FROM docker.io/lukechannings/deno:v1.34.1

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar ffmpeg
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.2.0.tar.gz | tar -xz --strip-components 1
RUN deno cache main.ts --import-map=import_map.json

CMD ["run", "-A", "main.ts"]
