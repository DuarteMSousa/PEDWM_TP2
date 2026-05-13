# Stage 1: Build the base sail image
FROM ubuntu:24.04 AS base

LABEL maintainer="Taylor Otwell"

ARG WWWGROUP
ARG NODE_VERSION=24
ARG POSTGRES_VERSION=18

WORKDIR /var/www/html

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV LANG=C.UTF-8
ENV SUPERVISOR_PHP_COMMAND="/usr/bin/php -d variables_order=EGPCS /var/www/html/artisan serve --host=0.0.0.0 --port=80"
ENV SUPERVISOR_PHP_USER="sail"

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get upgrade -y \
    && mkdir -p /etc/apt/keyrings \
    && apt-get install -y gnupg gosu curl ca-certificates zip unzip git supervisor sqlite3 libcap2-bin libpng-dev dnsutils librsvg2-bin nano \
    && curl -sS 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xb8dc7e53946656efbce4c1dd71daeaab4ad4cab6' | gpg --dearmor | tee /etc/apt/keyrings/ppa_ondrej_php.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/ppa_ondrej_php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu noble main" > /etc/apt/sources.list.d/ppa_ondrej_php.list \
    && apt-get update \
    && apt-get install -y \
        php8.5-cli php8.5-dev php8.5-pgsql php8.5-sqlite3 php8.5-gd \
        php8.5-curl php8.5-mbstring php8.5-xml php8.5-zip php8.5-bcmath \
        php8.5-soap php8.5-intl php8.5-readline php8.5-redis php8.5-igbinary \
        php8.5-msgpack php8.5-pcov php8.5-xdebug \
    && curl -sLS https://getcomposer.org/installer | php -- --install-dir=/usr/bin/ --filename=composer \
    && apt-get -y autoremove && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN groupadd --force -g ${WWWGROUP:-1000} sail \
    && useradd -ms /bin/bash --no-user-group -g ${WWWGROUP:-1000} -u 1337 sail

COPY vendor/laravel/sail/runtimes/8.5/start-container /usr/local/bin/start-container
COPY vendor/laravel/sail/runtimes/8.5/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY vendor/laravel/sail/runtimes/8.5/php.ini /etc/php/8.5/cli/conf.d/99-sail.ini
RUN chmod +x /usr/local/bin/start-container

# Stage 2: Copy application code
FROM base

WORKDIR /var/www/html

# Copy the full application (vendor included) into the image
COPY . .

RUN chown -R sail:sail /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["start-container"]
