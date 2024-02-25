FROM docker.io/denoland/deno:1.41.0

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.4.4.tar.gz | tar -xz --strip-components 1
RUN deno cache main.ts

CMD ["run", "-A", "main.ts"]
