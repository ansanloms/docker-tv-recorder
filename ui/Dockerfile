FROM docker.io/denoland/deno:2.1.4

WORKDIR /app
EXPOSE 8000

RUN apt-get update && apt-get install -y curl tar
RUN curl -L https://github.com/ansanloms/mirakc-ui/archive/refs/tags/v0.5.8.tar.gz | tar -xz --strip-components 1
RUN rm .env.example
RUN deno cache ./main.ts --allow-import
RUN deno task build

CMD ["run", "-A", "./main.ts"]
