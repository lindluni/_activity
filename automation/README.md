# Activity automation

## Getting started

After cloning this repository, install all script dependencies

```Bash
npm install
```

Next, set some environment variables that most of the scripts expect

| Name                     | Description                     |
| ------------------------ | ------------------------------- |
| `INACTIVE_APP_ID`        | GitHub App id                   |
| `INACTIVE_CLIENT_ID`     | GitHub App OAuth2 client id     |
| `INACTIVE_CLIENT_SECRET` | GitHub App OAuth2 client secret |
| `INACTIVE_PRIVATE_KEY`   | GitHub App private key          |

Finally, run the scripts!

```
node scripts/comments.js --days 7
```

### Debugging

Setting the environment variable `DEBUG` to `inactive:*` will trigger all debug messages to be written to console.

## Contributing

### Creating a new script

Create a new file in the [scripts](./scripts) directory, optionally using [template.js](./scripts/template.js) as a starting point.

If using the template, update the debugger to the name of your script, i.e. `inactive:comments` instead of `inactive:template`

### Running it with actions

Run your new script using GitHub Actions and define a new workflow.

### Styling

Run `npm run lint` or `npm run lint:fix` before committing to enfore code styles.
