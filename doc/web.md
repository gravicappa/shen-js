# Deploying Shen-js repl
To simply deploy Shen-js repl copy the following files/directories to some
place in your webroot:

  * shen.js
  * shen.html
  * web/

It will have its filesystem empty though. If you want to fill it with some
initial content then read the following section.

## Deploying synthetic filesystem 
Shen-js web UI tries to load (via xmlhttprequest/ajax) file `fs.json` located
in the same directory with `shen.html` which defines which files to load and
has simple structure:

    [
      {"from": "./relative/link", to: "local/path"},
      {"from": "http://absolute/link/...", to: "local/path"},
      ...
    ]
