# Shen-js web
## Github loader
If you want to load file 'dir/file.shen' from github repo
'https://github.com/user/repo' just type

    (load "https://github.com/user/repo/dir/file.shen")

Also you can add use [shen-libs](https://github.com/vasil-sd/shen-libs) by
just adding it to modulesys search path:

    (module.add-path "https://github.com/vasil-sd/shen-libs")

Then you can simply use libraries from the repo:

    (module.use [maths defstruct])

## Initialization file
You can create `.init.shen` file which is loaded on startup. `module.add-path`
can be added there.

## Deploying Shen-js repl
To simply deploy Shen-js repl copy the following files/directories to some
place in your webroot:

  * shen.js
  * shen.html
  * web/

It will have its filesystem empty though. If you want to fill it with some
initial content then read the following section.

### Deploying synthetic filesystem 
Shen-js web UI tries to load (via xmlhttprequest/ajax) file `fs.json` located
in the same directory with `shen.html` which defines which files to load and
has simple structure:

    [
      {"from": "./relative/link", to: "local/path"},
      {"from": "http://absolute/link/...", to: "local/path"},
      ...
    ]
