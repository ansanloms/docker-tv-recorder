FROM docker.io/denoland/deno:1.46.3

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.5.6.tar.gz | tar -xz --strip-components 1
RUN deno cache ./src/main.ts

CMD ["run", "-A", "./src/main.ts"]
