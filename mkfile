MKSHELL = rc
md = `{find . -name '*.md'}

all:V: ${md:%.md=%.html}
 ./prep_fs_index >fs.json

%.html: %.md
 sundown <$stem.md >$target
