FROM docker.io/denoland/deno:1.43.6

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.5.5.tar.gz | tar -xz --strip-components 1
RUN deno cache ./src/main.ts

CMD ["run", "-A", "./src/main.ts"]
