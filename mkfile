MKSHELL = rc
md = `{find . -name '*.md'}

all:V: ${md:%.md=%.html}
 ./prep_fs_index >fs.json

fix:V: $md
 ./fix_example $prereq

%.html: fix %.md
 sundown <$stem.md >$target
