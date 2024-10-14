FROM docker.io/denoland/deno:2.0.0

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.5.7.tar.gz | tar -xz --strip-components 1
RUN deno cache ./main.ts --allow-import

CMD ["run", "-A", "./main.ts"]
