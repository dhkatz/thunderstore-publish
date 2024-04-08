FROM denoland/deno as cache
ENV DENO_DIR=/var/tmp/deno_cache
COPY ./manifest.ts /manifest.ts
RUN deno cache /manifest.ts
FROM ghcr.io/dhkatz/tcli:latest
ENV DENO_DIR=/var/tmp/deno_cache
COPY --from=cache ${DENO_DIR} ${DENO_DIR}
COPY ./entrypoint.sh /entrypoint.sh
COPY ./manifest.ts /manifest.ts
RUN ["chmod", "+x", "/entrypoint.sh"]
ENTRYPOINT ["/entrypoint.sh"]
