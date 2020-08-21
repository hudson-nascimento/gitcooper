# GitCooper CLI

> A [gitmoji](https://github.com/carloscuesta/gitmoji) interactive client for using gitmojis on commit messages plus Redmine integration personalized for Coopersystem.

## About

This project is a fork of great package [gitmoji-cli](https://github.com/carloscuesta/gitmoji) (commit convention on FSD). GitCooper-cli has all gitmoji features adding some new features:

- Co-Authors contacts (For collaborative teams)
- Redmine integration
  - Create time entries without automatically to you follow your normal development flow!
  - Finish issue adding one option on command (TODO)

## Install

Clone the project in your preferred folder. E.g.:

```sh
cd ~/Projects
git clone http://git.coopersystem.com.br/fabrica/gitcooper-cli.git
cd gitcooper-cli
```

Install dependencies and create a build:

```sh
$ yarn install
$ yarn build
```

Create an alias in your `bash` or `zsh` appointing to built files. E.g.:

```sh
$ nano ~/.zshrc

# ... Other configs, alias, etc

alias gitcooper="~/Projects/gitcooper-cli/lib/cli.js"
```

Restart your shell:

```sh
$ zsh
```

### Configuring

Run `gitcooper -g` and answer the prompts.

**IMPORTANT:** Set your LDAP username and password to integration with Readmine works fine.

## Usage

```sh
gitcooper --help
```

```
The Coopersystem interactive client for create your commits.

  Usage
    $ gitcooper
  Options
    --config, -g     Setup gitcooper-cli preferences.
    --commit, -c    Interactively commit using the prompts
    --coAuthors,    Show option to add Co-Authors on commit. Works only with --commmit option
    --refs,         Show option to add issue on commit. Works only with --commmit option
    --timeEntry,    Create a time entry registry on redmine
    --list, -l      List all the available gitmojis
    --search, -s    Search gitmojis
    --version, -v   Print gitcooper-cli installed version
    --update, -u    Sync emoji list with the repo
```

### Commit

You can use the commit functionality in two ways, directly or via a commit-hook.

#### Client

Start the interactive commit client, to auto generate your commit based on your prompts.

```bash
gitcooper -c
```

The client has the options `--coAuthors` and `--refs`.

##### Co-authors

Allow to add commit co-authors:

```
? Co-authors (Separated by comma): Foo Bar <foo.bar@example.com>, Name <name@example.com>
```

You can still create **contacts** with some pre-defined co-authors. To manage your contacts execute the command `gitmoji -g` on option `Co-authors contacts definitions.`. Add a list of contacts with following definitions: `@ContactId: Name <email@domain.com>`. E.g.:

```
@Carlos: Carlos Cuesta <hi@carloscuesta.me>
@John: John Doe <john.doe@example.com>
```

**IMPORTANT:** Add each contact in one line.

Now you can use the contacts on `Co-authors` option.

```
? Co-authors (Separated by comma): @Carlos, @John, Name <name@example.com>
```

##### Refs

Allow to add commit Issue/PR reference:

```
? Issue reference: #123 !321
```

##### Time entry

Add time entry on redmine for issue defined on `--refs` option. If `--refs` option is not passed, the last updated issue in execution will be used to create time entry.

IMPORTANT: You must defined your LDAP credentials using `gitcooper -g` option.

### Search

Search using specific keywords to find the right gitmoji.

```bash
gitcooper bug linter -s
```

![gitmoji list](https://user-images.githubusercontent.com/7629661/41189878-d24a3b78-6bd4-11e8-8d47-c8edf3b87e53.png)

### List

Pretty print all the available gitmojis.

```bash
gitcooper -l
```

![gitmoji list](https://user-images.githubusercontent.com/7629661/41189877-d22b145a-6bd4-11e8-97f8-a8e36bcab062.png)

### Update

Update the gitmojis list, by default the first time you run gitmoji, the cli creates a cache to allow using this tool without internet connection.

```bash
gitcooper -u
```

### Config

Run `gitcooper -g` to setup some gitcooper-cli preferences, such as the auto `git add .` feature.

![gitmoji config](https://user-images.githubusercontent.com/7629661/41189876-d21167ee-6bd4-11e8-9008-4c987502f307.png)
