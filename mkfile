MKSHELL = rc
srcdir = src
md = `{find $srcdir -name '*.md'}

all:V: ${md:%.md=%.html}
 ./prep_fs_index >fs.json

fix:V: $md
 ./fix_example $prereq

%.html: fix %.md
 sundown <$stem.md >$target
