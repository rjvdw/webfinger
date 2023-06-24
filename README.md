# webfinger

Command line tool to perform a webfinger query.

## Installation

```shell
npm ci
npm link
```

## Usage

```shell
webfinger john.doe@example.com
webfinger @john.doe@example.com
webfinger john.doe --hostname example.com
webfinger john.doe@example.com --hostname mastodon.com
webfinger john.doe@example.com --json
```
